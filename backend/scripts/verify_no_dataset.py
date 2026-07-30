#!/usr/bin/env python3
"""Verify Vision works without dataset/ and cites mined DB accurately."""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

SEED_PATH = BACKEND / "app" / "data" / "reference_seed.json"
KEY_FIELDS = [
    "plot_name", "site_name", "ecoregion", "latitude", "longitude",
    "grass_cover_pct", "bare_ground_pct", "litter_pct", "woody_cover_pct",
    "perennial_grass_pct", "annual_grass_pct", "standing_crop_estimate",
]

PASS = True


def note(msg: str) -> None:
    print(msg)


def fail(msg: str) -> None:
    global PASS
    PASS = False
    note("FAIL: " + msg)


def ok(msg: str) -> None:
    note("PASS: " + msg)


def approx_eq(a, b, tol=0.6) -> bool:
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    try:
        return abs(float(a) - float(b)) <= tol
    except (TypeError, ValueError):
        return str(a).strip() == str(b).strip()


def load_seed_plot(name: str) -> dict:
    data = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    for p in data.get("plots", []):
        if p.get("plot_name") == name:
            return p
    raise KeyError(name)


def main() -> int:
    from dotenv import load_dotenv
    load_dotenv()

    from sqlalchemy import text
    from sqlalchemy.orm import Session

    from app.database import SessionLocal
    from app.models import Camp, Farm, User
    from app.models.reference import ReferencePlot
    from app.services import matching_service
    from app.agent.fallback import rule_based_assessment
    from app.agent import agent as agent_mod

    dataset = ROOT / "dataset"
    dataset_off = ROOT / "dataset__off"
    note("=== LEARNING vs RETRIEVAL ===")
    note(
        "The agent does NOT fine-tune or learn weights from the Namibia dataset. "
        "At inference it retrieves mined Postgres rows via tools/matching. "
        "Accuracy = tool retrieval + correct citation of DB numbers."
    )
    note("")

    note("=== DATASET FOLDER ===")
    note("dataset exists: " + str(dataset.exists()))
    note("dataset__off exists: " + str(dataset_off.exists()))
    if dataset.exists():
        fail("dataset/ still present — runtime independence not proven this run")
    else:
        ok("dataset/ absent during verification")

    db: Session = SessionLocal()
    try:
        note("")
        note("=== ROW COUNTS ===")
        for t in [
            "reference_plots",
            "reference_cover_rounds",
            "reference_species",
            "reference_photo_meta",
        ]:
            n = db.execute(text("SELECT COUNT(*) FROM " + t)).scalar()
            note(t + "=" + str(n))
        nn = db.execute(
            text("SELECT COUNT(*) FROM reference_photo_meta WHERE image_data IS NOT NULL")
        ).scalar()
        note("reference_photo_meta.image_data non-null=" + str(nn))
        seed_data = json.loads(SEED_PATH.read_text(encoding="utf-8"))
        note("seed plots=" + str(len(seed_data.get("plots", []))))

        note("")
        note("=== okah_1 DB vs seed ===")
        seed = load_seed_plot("okah_1")
        row = db.query(ReferencePlot).filter(ReferencePlot.plot_name == "okah_1").one()
        mismatches = []
        for f in KEY_FIELDS:
            sv, dv = seed.get(f), getattr(row, f)
            if f in ("latitude", "longitude") or f.endswith("_pct") or f == "standing_crop_estimate":
                match = approx_eq(sv, dv, tol=0.51)
            else:
                match = (sv or None) == (dv or None) or str(sv or "") == str(dv or "")
            status = "OK" if match else "MISMATCH"
            note("  " + f + ": seed=" + repr(sv) + " db=" + repr(dv) + " [" + status + "]")
            if not match:
                mismatches.append(f)
        if mismatches:
            fail("okah_1 field mismatches: " + str(mismatches))
        else:
            ok("okah_1 key fields match seed")

        db_names = {r.plot_name for r in db.query(ReferencePlot.plot_name).all()}
        note("DB plot_name count=" + str(len(db_names)))

        note("")
        note("=== DEMO CAMP + MATCHING ===")
        user = db.query(User).filter(User.email == "demo@vision.na").first()
        if not user:
            fail("demo@vision.na user missing")
            return 1
        farm = db.query(Farm).filter(Farm.user_id == user.id).first()
        camps = db.query(Camp).filter(Camp.farm_id == farm.id).all() if farm else []
        camp = next((c for c in camps if c.latitude is not None and c.longitude is not None), None)
        if not camp:
            fail("no demo camp with lat/lon")
            return 1
        note(
            "camp id=" + str(camp.id) + " name=" + repr(camp.name)
            + " lat=" + str(camp.latitude) + " lon=" + str(camp.longitude)
            + " cattle=" + str(camp.cattle_count)
        )

        comps = matching_service.find_comparable_plots(
            db, camp.latitude, camp.longitude, ecoregion=None, limit=5
        )
        note("comparable_plots returned=" + str(len(comps)))
        for c in comps:
            pn = c.get("plot_name")
            if pn not in db_names:
                fail("invented plot_name in matching: " + str(pn))
                continue
            dbp = db.query(ReferencePlot).filter(ReferencePlot.plot_name == pn).one()
            gc_ok = ("grass_cover_pct" not in c) or approx_eq(
                c.get("grass_cover_pct"), dbp.grass_cover_pct
            )
            bg_ok = ("bare_ground_pct" not in c) or approx_eq(
                c.get("bare_ground_pct"), dbp.bare_ground_pct
            )
            if not gc_ok or not bg_ok:
                fail(
                    "metric mismatch for " + str(pn)
                    + ": result gc=" + str(c.get("grass_cover_pct"))
                    + " db=" + str(dbp.grass_cover_pct)
                    + " bg=" + str(c.get("bare_ground_pct"))
                    + " db=" + str(dbp.bare_ground_pct)
                )
            else:
                ok(
                    str(pn) + " dist=" + str(c.get("distance_km")) + " km"
                    + " gc=" + str(c.get("grass_cover_pct"))
                    + " bg=" + str(c.get("bare_ground_pct"))
                    + " [" + str(c.get("comparability")) + "]"
                )

        note("")
        note("=== ASSESSMENT (agent or rule_based) ===")
        has_key = bool(os.getenv("OPENAI_API_KEY"))
        note("OPENAI_API_KEY set: " + str(has_key))
        if has_key:
            result = agent_mod.run_assessment(db, camp, photo_ids=None, question=None)
            engine = result.get("engine") or (result.get("calculations") or {}).get("engine")
            note("engine=" + str(engine))
        else:
            result = rule_based_assessment(db, camp)
            note("engine=rule_based_fallback (no API key)")

        refs = result.get("references") or []
        evidence = result.get("evidence") or []
        blob = "\n".join([
            json.dumps(refs, default=str),
            json.dumps(evidence, default=str),
            str(result.get("direct_answer") or ""),
            str(result.get("recommendation") or ""),
            json.dumps(result.get("reasons") or [], default=str),
        ])
        note("references count=" + str(len(refs)))
        note("evidence count=" + str(len(evidence)))

        cited_names = set()
        for r in refs:
            if isinstance(r, dict) and r.get("plot_name"):
                cited_names.add(r["plot_name"])
            elif isinstance(r, str):
                for pn in db_names:
                    if pn in r:
                        cited_names.add(pn)
        for m in re.findall(r"\b([a-z]{2,12}_\d+)\b", blob, flags=re.I):
            cited_names.add(m)

        invented = sorted(n for n in cited_names if n not in db_names)
        valid_cited = sorted(n for n in cited_names if n in db_names)
        note("cited plot_names in DB: " + str(valid_cited))
        if invented:
            fail("invented plot names not in DB: " + str(invented))
        else:
            ok("all cited plot_names exist in DB (or none invented)")

        metric_fail = 0
        for pn in valid_cited:
            dbp = db.query(ReferencePlot).filter(ReferencePlot.plot_name == pn).one()
            for r in refs:
                if not isinstance(r, dict) or r.get("plot_name") != pn:
                    continue
                for field in ("grass_cover_pct", "bare_ground_pct", "woody_cover_pct"):
                    if field in r and r[field] is not None:
                        if not approx_eq(r[field], getattr(dbp, field)):
                            fail(
                                "assessment ref " + pn + "." + field + "="
                                + str(r[field]) + " != db " + str(getattr(dbp, field))
                            )
                            metric_fail += 1
                        else:
                            ok(
                                "assessment ref " + pn + "." + field + "="
                                + str(r[field]) + " matches DB"
                            )
        if metric_fail == 0:
            ok("quoted metrics in structured references match DB (within tolerance)")

        note("")
        note("OVERALL: " + ("PASS" if PASS else "FAIL"))
        return 0 if PASS else 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
