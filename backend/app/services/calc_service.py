"""Deterministic, transparent calculations.

Livestock species are never silently merged. Counts are reported per species. A Large
Stock Unit (LSU) estimate is offered separately using a disclosed Namibian convention,
always labelled an estimate with the formula shown.
"""

from __future__ import annotations

from datetime import date

# Namibian rangeland convention (Meat Board / Agra / NAU extension guidance):
#   1 head of cattle          = 1.0 Large Stock Unit (LSU)
#   ~6 goats or sheep         = 1.0 LSU  (i.e. 1 small stock = ~0.167 LSU)
LSU_PER_CATTLE = 1.0
LSU_PER_SMALLSTOCK = 1.0 / 6.0
LSU_FORMULA = "1 cattle = 1.0 LSU; 6 goats or sheep = 1.0 LSU (Namibian extension convention)"


def livestock_units(cattle: int, goats: int, sheep: int) -> dict:
    cattle = cattle or 0
    goats = goats or 0
    sheep = sheep or 0
    lsu = cattle * LSU_PER_CATTLE + (goats + sheep) * LSU_PER_SMALLSTOCK
    return {
        "cattle_count": cattle,
        "goat_count": goats,
        "sheep_count": sheep,
        "large_stock_units_estimate": round(lsu, 2),
        "formula": LSU_FORMULA,
        "note": "LSU is an estimate to compare grazing pressure across species; it is not a measured value.",
    }


def livestock_per_hectare(cattle: int, goats: int, sheep: int, area_ha: float | None) -> dict:
    lu = livestock_units(cattle, goats, sheep)
    result = {
        **lu,
        "area_ha": area_ha,
        "cattle_per_ha": None,
        "lsu_per_ha": None,
        "ha_per_lsu": None,
    }
    if area_ha and area_ha > 0:
        result["cattle_per_ha"] = round((cattle or 0) / area_ha, 4)
        if lu["large_stock_units_estimate"] > 0:
            result["lsu_per_ha"] = round(lu["large_stock_units_estimate"] / area_ha, 4)
            result["ha_per_lsu"] = round(area_ha / lu["large_stock_units_estimate"], 2)
    else:
        result["note"] = result["note"] + " Camp area is unknown, so per-hectare pressure could not be calculated."
    return result


def grazing_duration(grazing_start: date | None) -> dict:
    if grazing_start is None:
        return {"days_on_camp": None, "note": "No grazing start date was provided."}
    days = (date.today() - grazing_start).days
    return {
        "grazing_start_date": grazing_start.isoformat(),
        "days_on_camp": days,
        "note": "Days the herd has been on this camp since the recorded grazing start date.",
    }
