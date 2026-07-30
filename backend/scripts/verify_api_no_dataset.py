#!/usr/bin/env python3
"""HTTP API verification with dataset folder renamed away."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
SEED = BACKEND / "app" / "data" / "reference_seed.json"
BASE = "http://127.0.0.1:8000"

PASS = True


def fail(m):
    global PASS
    PASS = False
    print("FAIL:", m)


def ok(m):
    print("PASS:", m)


def approx_eq(a, b, tol=0.6):
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    try:
        return abs(float(a) - float(b)) <= tol
    except Exception:
        return str(a) == str(b)


def main():
    print("=== DATASET DURING API TEST ===")
    print("dataset exists:", (ROOT / "dataset").exists())
    print("dataset__off exists:", (ROOT / "dataset__off").exists())
    if (ROOT / "dataset").exists():
        fail("dataset should be renamed away")
    else:
        ok("dataset absent for API test")

    seed = json.loads(SEED.read_text(encoding="utf-8"))
    seed_okah = next(p for p in seed["plots"] if p["plot_name"] == "okah_1")

    with httpx.Client(base_url=BASE, timeout=120.0) as client:
        # health / docs
        r = client.get("/docs")
        if r.status_code != 200:
            fail("uvicorn not serving /docs status=" + str(r.status_code))
            return 1
        ok("uvicorn up")

        r = client.post("/api/auth/login", json={"email": "demo@vision.na", "password": "vision123"})
        if r.status_code != 200:
            # try register
            print("login failed", r.status_code, r.text[:300])
            r = client.post(
                "/api/auth/register",
                json={
                    "full_name": "Demo User",
                    "email": "demo@vision.na",
                    "password": "vision123",
                    "farm_name": "Demo Farm",
                },
            )
            print("register", r.status_code, r.text[:300])
            r = client.post("/api/auth/login", json={"email": "demo@vision.na", "password": "vision123"})
        if r.status_code != 200:
            fail("login failed: " + r.text[:400])
            return 1
        token = r.json()["access_token"]
        ok("login demo@vision.na")
        headers = {"Authorization": "Bearer " + token}

        r = client.get("/api/dataset/ecoregions")
        if r.status_code != 200:
            fail("ecoregions " + str(r.status_code))
        else:
            ecos = r.json()
            print("ecoregions sample:", ecos[:8] if isinstance(ecos, list) else ecos)
            if not ecos:
                fail("ecoregions empty")
            else:
                joined = " ".join(str(x) for x in (ecos if isinstance(ecos, list) else [ecos])).lower()
                if "namibia" in joined or "savanna" in joined or "karoo" in joined or "woodland" in joined or "desert" in joined or "okah" in joined:
                    ok("ecoregions look Namibian/real: count=" + str(len(ecos) if isinstance(ecos, list) else 1))
                else:
                    # still pass if non-empty real strings from DB
                    ok("ecoregions non-empty from DB count=" + str(len(ecos) if isinstance(ecos, list) else 1))

        r = client.get("/api/dataset/plots", params={"query": "okah"})
        if r.status_code != 200:
            fail("plots?query=okah " + str(r.status_code))
        else:
            plots = r.json()
            print("okah plots:", [(p.get("plot_name"), p.get("grass_cover_pct")) for p in plots[:10]])
            if not plots:
                fail("no okah plots")
            elif any(p.get("grass_cover_pct") is not None for p in plots):
                ok("plots?query=okah returned mined grass_cover")
            else:
                fail("okah plots missing grass_cover")

        r = client.get("/api/dataset/plots/okah_1")
        if r.status_code != 200:
            fail("plot okah_1 " + str(r.status_code) + " " + r.text[:200])
        else:
            p = r.json()
            mismatches = []
            for f in [
                "plot_name", "grass_cover_pct", "bare_ground_pct", "woody_cover_pct",
                "latitude", "longitude", "ecoregion", "site_name",
            ]:
                api_v = p.get(f)
                seed_v = seed_okah.get(f)
                if f in ("grass_cover_pct", "bare_ground_pct", "woody_cover_pct", "latitude", "longitude"):
                    good = approx_eq(api_v, seed_v, 0.51)
                else:
                    good = (api_v or None) == (seed_v or None) or str(api_v or "") == str(seed_v or "")
                print("  okah_1", f, "api=", api_v, "seed=", seed_v, "OK" if good else "BAD")
                if not good:
                    mismatches.append(f)
            if mismatches:
                fail("API okah_1 != seed: " + str(mismatches))
            else:
                ok("GET /plots/okah_1 matches seed")

        r = client.get("/api/farms", headers=headers)
        if r.status_code != 200:
            fail("farms " + str(r.status_code) + " " + r.text[:200])
            return 1 if not PASS else 0
        farms = r.json()
        print("farms:", farms)
        farm_id = farms[0]["id"] if farms else None
        if not farm_id:
            fail("no farms")
            return 1

        # camps may be nested or separate endpoint
        r = client.get("/api/farms/" + str(farm_id), headers=headers)
        farm_detail = r.json() if r.status_code == 200 else {}
        camps = farm_detail.get("camps") or []
        if not camps:
            r = client.get("/api/camps", headers=headers, params={"farm_id": farm_id})
            if r.status_code == 200:
                camps = r.json()
        print("camps:", [(c.get("id"), c.get("name"), c.get("latitude"), c.get("longitude")) for c in camps])
        camp = next((c for c in camps if c.get("latitude") is not None and c.get("longitude") is not None), None)
        if not camp:
            fail("no camp with lat/lon via API")
            return 1
        camp_id = camp["id"]
        ok("picked camp id=" + str(camp_id) + " " + str(camp.get("name")))

        r = client.get("/api/camps/" + str(camp_id) + "/references", headers=headers)
        if r.status_code != 200:
            fail("camp references " + str(r.status_code) + " " + r.text[:300])
        else:
            refs = r.json()
            print("references count", len(refs) if isinstance(refs, list) else refs)
            if not isinstance(refs, list) or not refs:
                fail("empty camp references")
            else:
                sample = refs[0]
                need = ["plot_name", "distance_km"]
                # distance may be distance
                has_dist = "distance_km" in sample or "distance" in sample
                if "plot_name" not in sample or not has_dist:
                    fail("references missing plot_name/distance: keys=" + str(list(sample.keys())))
                else:
                    ok("camp references have plot_name + distance; sample=" + str({
                        k: sample.get(k) for k in ("plot_name", "distance_km", "grass_cover_pct", "bare_ground_pct", "comparability")
                    }))
                # all names must be real — load from seed plot names at minimum
                seed_names = {p["plot_name"] for p in seed["plots"]}
                invented = [x.get("plot_name") for x in refs if x.get("plot_name") not in seed_names]
                if invented:
                    fail("invented ref plots: " + str(invented))
                else:
                    ok("all reference plot_names in seed/DB set")

        herd = {
            "cattle_count": camp.get("cattle_count"),
            "goat_count": camp.get("goat_count"),
            "sheep_count": camp.get("sheep_count"),
            "area_ha": camp.get("area_ha"),
            "rotational_grazing": camp.get("rotational_grazing"),
        }
        # drop Nones
        herd = {k: v for k, v in herd.items() if v is not None}
        r = client.post(
            "/api/assessments",
            headers=headers,
            json={"camp_id": camp_id, "herd": herd or None, "photo_ids": [], "question": None},
        )
        if r.status_code not in (200, 201):
            fail("assessment POST " + str(r.status_code) + " " + r.text[:500])
        else:
            a = r.json()
            print("assessment status=", a.get("status"), "engine=", (a.get("calculations") or {}).get("engine"))
            print("references=", a.get("references"))
            print("evidence=", a.get("evidence"))
            seed_names = {p["plot_name"] for p in seed["plots"]}
            cited = set()
            for item in (a.get("references") or []):
                if isinstance(item, dict) and item.get("plot_name"):
                    cited.add(item["plot_name"])
                elif isinstance(item, str):
                    for pn in seed_names:
                        if pn in item:
                            cited.add(pn)
            blob = json.dumps(a, default=str)
            import re
            for m in re.findall(r"\b([a-z]{2,12}_\d+)\b", blob, flags=re.I):
                cited.add(m)
            invented = sorted(x for x in cited if x not in seed_names)
            valid = sorted(x for x in cited if x in seed_names)
            print("cited valid", valid)
            print("cited invented", invented)
            if invented:
                fail("assessment invented plot names: " + str(invented))
            else:
                ok("assessment plot names subset of DB/seed")

            # metric check vs seed for structured refs
            seed_by = {p["plot_name"]: p for p in seed["plots"]}
            for item in (a.get("references") or []):
                if not isinstance(item, dict) or not item.get("plot_name"):
                    continue
                sp = seed_by.get(item["plot_name"])
                if not sp:
                    continue
                for field in ("grass_cover_pct", "bare_ground_pct", "woody_cover_pct"):
                    if item.get(field) is not None:
                        if approx_eq(item[field], sp.get(field)):
                            ok("assessment " + item["plot_name"] + "." + field + " matches")
                        else:
                            fail(
                                "assessment " + item["plot_name"] + "." + field
                                + "=" + str(item[field]) + " seed=" + str(sp.get(field))
                            )

    print("")
    print("API OVERALL:", "PASS" if PASS else "FAIL")
    return 0 if PASS else 1


if __name__ == "__main__":
    raise SystemExit(main())
