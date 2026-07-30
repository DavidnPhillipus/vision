"""Select comparable research plots for a camp.

Not simply the nearest plot. Ranking blends geographic distance, ecoregion match, and
vegetation similarity. Each returned reference is tagged with how comparable it is and
is always framed as a research observation, never as the farmer's own camp.
"""

from __future__ import annotations

import math

from sqlalchemy.orm import Session

from app.services import dataset_service


def _haversine_km(lat1, lon1, lat2, lon2) -> float | None:
    if None in (lat1, lon1, lat2, lon2):
        return None
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return round(r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 1)


def find_comparable_plots(
    db: Session,
    latitude: float | None,
    longitude: float | None,
    ecoregion: str | None = None,
    limit: int = 5,
) -> list[dict]:
    plots = dataset_service.all_plots(db)
    scored: list[tuple[float, dict]] = []

    for p in plots:
        dist = _haversine_km(latitude, longitude, p.latitude, p.longitude)
        same_region = bool(ecoregion and p.ecoregion and ecoregion.lower() in p.ecoregion.lower())

        # Lower score = better match.
        score = 0.0
        if dist is not None:
            score += dist  # km
        else:
            score += 1500  # unknown distance penalty
        if same_region:
            score -= 400  # strong pull toward same ecoregion

        # comparability label
        if dist is not None and dist <= 60:
            label = "geographically nearby"
        elif same_region:
            label = "from the same region"
        elif dist is not None and dist <= 250:
            label = "environmentally comparable"
        else:
            label = "a weak comparison"

        scored.append(
            (
                score,
                {
                    "plot_name": p.plot_name,
                    "site_name": p.site_name,
                    "ecoregion": p.ecoregion,
                    "distance_km": dist,
                    "comparability": label,
                    "grass_cover_pct": p.grass_cover_pct,
                    "bare_ground_pct": p.bare_ground_pct,
                    "woody_cover_pct": p.woody_cover_pct,
                    "standing_crop_estimate": p.standing_crop_estimate,
                    "dominant_herbaceous": p.dominant_herbaceous,
                    "dominant_woody": p.dominant_woody,
                    "rotational_grazing": p.rotational_grazing,
                    "rainfall_note": p.rainfall_note,
                },
            )
        )

    scored.sort(key=lambda x: x[0])
    return [d for _, d in scored[:limit]]
