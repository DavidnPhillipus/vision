"""Portable reference dataset seed (JSON) for cloud / fresh installs.

After mining Excel once with ``build_reference``, this seed is the source of truth
that ships with the backend. Runtime never opens the ``dataset/`` folder.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.database import SessionLocal
from app.models import ReferenceCoverRound, ReferencePhotoMeta, ReferencePlot, ReferenceSpecies

SEED_DIR = Path(__file__).resolve().parent.parent / "data"
SEED_FILE = SEED_DIR / "reference_seed.json"
SEED_VERSION = 2


def seed_path() -> Path:
    return SEED_FILE


def _plot_row(p: ReferencePlot) -> dict:
    return {
        "plot_name": p.plot_name,
        "site_name": p.site_name,
        "ecoregion": p.ecoregion,
        "latitude": p.latitude,
        "longitude": p.longitude,
        "area_ha": p.area_ha,
        "perennial_grass_pct": p.perennial_grass_pct,
        "annual_grass_pct": p.annual_grass_pct,
        "grass_cover_pct": p.grass_cover_pct,
        "bare_ground_pct": p.bare_ground_pct,
        "litter_pct": p.litter_pct,
        "woody_cover_pct": p.woody_cover_pct,
        "standing_crop_estimate": p.standing_crop_estimate,
        "biomass_clipped": p.biomass_clipped,
        "woody_mean_height": p.woody_mean_height,
        "woody_seedlings": p.woody_seedlings,
        "cattle_count": p.cattle_count,
        "goat_count": p.goat_count,
        "sheep_count": p.sheep_count,
        "rotational_grazing": p.rotational_grazing,
        "rainfall_note": p.rainfall_note,
        "rainfall_mm": p.rainfall_mm,
        "livestock_comments": p.livestock_comments,
        "grazing_comments": p.grazing_comments,
        "game_note": p.game_note,
        "other_comments": p.other_comments,
        "dominant_herbaceous": p.dominant_herbaceous,
        "dominant_woody": p.dominant_woody,
        "photo_count": p.photo_count,
    }


def export_reference_seed(path: Path | None = None) -> Path:
    out = path or SEED_FILE
    out.parent.mkdir(parents=True, exist_ok=True)
    db = SessionLocal()
    try:
        payload = {
            "version": SEED_VERSION,
            "plots": [_plot_row(p) for p in db.query(ReferencePlot).order_by(ReferencePlot.plot_name).all()],
            "cover_rounds": [
                {
                    "plot_name": r.plot_name,
                    "round": r.round,
                    "grass_cover_pct": r.grass_cover_pct,
                    "perennial_grass_pct": r.perennial_grass_pct,
                    "annual_grass_pct": r.annual_grass_pct,
                    "bare_ground_pct": r.bare_ground_pct,
                    "litter_pct": r.litter_pct,
                    "woody_cover_pct": r.woody_cover_pct,
                }
                for r in db.query(ReferenceCoverRound)
                .order_by(ReferenceCoverRound.plot_name, ReferenceCoverRound.round)
                .all()
            ],
            "species": [
                {
                    "plot_name": s.plot_name,
                    "plant_type": s.plant_type,
                    "species_name": s.species_name,
                }
                for s in db.query(ReferenceSpecies)
                .order_by(ReferenceSpecies.plot_name, ReferenceSpecies.plant_type)
                .all()
            ],
            "photos": [
                {
                    "plot_name": p.plot_name,
                    "direction": p.direction,
                    "round": p.round,
                    "filename": p.filename,
                    # Image bytes live only in Postgres (too large for the JSON seed).
                    "has_image": bool(p.image_data),
                    "byte_size": p.byte_size,
                }
                for p in db.query(ReferencePhotoMeta).order_by(ReferencePhotoMeta.filename).all()
            ],
        }
    finally:
        db.close()

    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return out


def load_reference_seed(path: Path | None = None, *, replace: bool = True) -> dict:
    """Load mined reference data from the committed JSON seed into Postgres."""
    src = path or SEED_FILE
    if not src.exists():
        raise FileNotFoundError(
            f"Reference seed not found at {src}. "
            "Either commit backend/app/data/reference_seed.json or run "
            "python -m app.etl.build_reference with the local dataset/ folder."
        )

    payload = json.loads(src.read_text(encoding="utf-8"))
    db = SessionLocal()
    try:
        if replace:
            db.query(ReferencePhotoMeta).delete()
            db.query(ReferenceSpecies).delete()
            db.query(ReferenceCoverRound).delete()
            db.query(ReferencePlot).delete()
            db.commit()

        allowed = {c.name for c in ReferencePlot.__table__.columns} - {"id"}
        n_plots = 0
        for row in payload.get("plots") or []:
            data = {k: v for k, v in row.items() if k in allowed}
            if not data.get("plot_name"):
                continue
            db.add(ReferencePlot(**data))
            n_plots += 1

        n_rounds = 0
        for row in payload.get("cover_rounds") or []:
            if not row.get("plot_name") or not row.get("round"):
                continue
            db.add(ReferenceCoverRound(**{k: row.get(k) for k in (
                "plot_name",
                "round",
                "grass_cover_pct",
                "perennial_grass_pct",
                "annual_grass_pct",
                "bare_ground_pct",
                "litter_pct",
                "woody_cover_pct",
            )}))
            n_rounds += 1

        n_species = 0
        for row in payload.get("species") or []:
            if not row.get("plot_name") or not row.get("species_name"):
                continue
            db.add(
                ReferenceSpecies(
                    plot_name=row["plot_name"],
                    plant_type=row.get("plant_type") or "unknown",
                    species_name=row["species_name"],
                )
            )
            n_species += 1

        n_photos = 0
        for row in payload.get("photos") or []:
            if not row.get("filename"):
                continue
            db.add(
                ReferencePhotoMeta(
                    plot_name=row.get("plot_name"),
                    direction=row.get("direction"),
                    round=row.get("round"),
                    filename=row["filename"],
                )
            )
            n_photos += 1

        db.commit()
    finally:
        db.close()

    result = {
        "plots": n_plots,
        "cover_rounds": n_rounds,
        "species": n_species,
        "photo_meta": n_photos,
        "source": str(src),
    }
    print("Loaded reference seed:", result)
    return result
