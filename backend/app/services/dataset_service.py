"""Query helpers over the reference (research) dataset tables — Postgres only."""

from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import ReferenceCoverRound, ReferencePhotoMeta, ReferencePlot, ReferenceSpecies


def _plot_to_dict(p: ReferencePlot) -> dict:
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


def list_ecoregions(db: Session) -> list[str]:
    rows = db.execute(
        select(ReferencePlot.ecoregion).where(ReferencePlot.ecoregion.is_not(None)).distinct()
    ).scalars().all()
    return sorted({r for r in rows if r})


def search_plots(
    db: Session,
    ecoregion: str | None = None,
    query: str | None = None,
    limit: int = 15,
) -> list[dict]:
    stmt = select(ReferencePlot)
    if ecoregion:
        stmt = stmt.where(ReferencePlot.ecoregion.ilike(f"%{ecoregion}%"))
    if query:
        like = f"%{query}%"
        species_plots = (
            select(ReferenceSpecies.plot_name)
            .where(ReferenceSpecies.species_name.ilike(like))
            .distinct()
        )
        stmt = stmt.where(
            or_(
                ReferencePlot.site_name.ilike(like),
                ReferencePlot.plot_name.ilike(like),
                ReferencePlot.dominant_herbaceous.ilike(like),
                ReferencePlot.dominant_woody.ilike(like),
                ReferencePlot.ecoregion.ilike(like),
                ReferencePlot.plot_name.in_(species_plots),
            )
        )
    stmt = stmt.limit(limit)
    return [_plot_to_dict(p) for p in db.execute(stmt).scalars().all()]


def get_plot(db: Session, plot_name: str) -> dict | None:
    p = db.execute(
        select(ReferencePlot).where(ReferencePlot.plot_name == plot_name)
    ).scalar_one_or_none()
    return _plot_to_dict(p) if p else None


def get_species(db: Session, plot_name: str) -> list[dict]:
    rows = db.execute(
        select(ReferenceSpecies).where(ReferenceSpecies.plot_name == plot_name)
    ).scalars().all()
    return [{"plant_type": r.plant_type, "species_name": r.species_name} for r in rows]


def get_photo_meta(db: Session, plot_name: str) -> list[dict]:
    rows = db.execute(
        select(ReferencePhotoMeta).where(ReferencePhotoMeta.plot_name == plot_name)
    ).scalars().all()
    return [
        {
            "id": r.id,
            "direction": r.direction,
            "round": r.round,
            "filename": r.filename,
            "has_image": bool(r.image_data),
            "byte_size": r.byte_size,
            "content_type": r.content_type,
        }
        for r in rows
    ]


def get_photo(db: Session, photo_id: int) -> ReferencePhotoMeta | None:
    return db.get(ReferencePhotoMeta, photo_id)


def list_assets(db: Session) -> list[dict]:
    from app.models import ReferenceAsset

    rows = db.execute(select(ReferenceAsset).order_by(ReferenceAsset.kind, ReferenceAsset.filename)).scalars().all()
    return [
        {
            "id": r.id,
            "kind": r.kind,
            "filename": r.filename,
            "title": r.title,
            "content_type": r.content_type,
            "byte_size": r.byte_size,
        }
        for r in rows
    ]


def get_asset(db: Session, asset_id: int):
    from app.models import ReferenceAsset

    return db.get(ReferenceAsset, asset_id)


def get_cover_rounds(db: Session, plot_name: str) -> list[dict]:
    rows = db.execute(
        select(ReferenceCoverRound).where(ReferenceCoverRound.plot_name == plot_name)
    ).scalars().all()
    order = {"feb_23": 0, "may_23": 1, "feb_24": 2, "april_24": 3, "may_24": 4}
    out = [
        {
            "round": r.round,
            "grass_cover_pct": r.grass_cover_pct,
            "perennial_grass_pct": r.perennial_grass_pct,
            "annual_grass_pct": r.annual_grass_pct,
            "bare_ground_pct": r.bare_ground_pct,
            "litter_pct": r.litter_pct,
            "woody_cover_pct": r.woody_cover_pct,
        }
        for r in rows
    ]
    return sorted(out, key=lambda x: order.get(x["round"], 99))


def all_plots(db: Session) -> list[ReferencePlot]:
    return db.execute(select(ReferencePlot)).scalars().all()
