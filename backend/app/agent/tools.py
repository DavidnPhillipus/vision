"""Tool definitions and dispatch for the Vision tool-calling agent.

Each tool is a real function over the database, deterministic calculators, the weather
service, and the dataset. The LLM decides which to call; this module executes them.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.models import Assessment, Camp, CampPhoto, Farm
from app.services import calc_service, dataset_service, matching_service, weather_service


@dataclass
class ToolContext:
    db: Session
    default_camp_id: int | None = None
    default_farm_id: int | None = None
    photo_analyzer: object | None = None  # callable(list[CampPhoto]) -> list[dict]
    tools_used: list[str] = field(default_factory=list)


def _camp(ctx: ToolContext, camp_id: int | None) -> Camp | None:
    cid = camp_id or ctx.default_camp_id
    if cid is None:
        return None
    return ctx.db.get(Camp, cid)


def _camp_public(c: Camp) -> dict:
    return {
        "camp_id": c.id,
        "name": c.name,
        "region": c.region,
        "latitude": c.latitude,
        "longitude": c.longitude,
        "area_ha": c.area_ha,
        "cattle_count": c.cattle_count,
        "goat_count": c.goat_count,
        "sheep_count": c.sheep_count,
        "other_livestock": c.other_livestock,
        "grazing_start_date": c.grazing_start_date.isoformat() if c.grazing_start_date else None,
        "rotational_grazing": c.rotational_grazing,
        "observations": c.observations,
        "source": "farmer-provided",
    }


# --------------------------------------------------------------------------- tools
def get_farm_and_camp(ctx: ToolContext, camp_id: int | None = None) -> dict:
    c = _camp(ctx, camp_id)
    if not c:
        return {"error": "No camp id given and no camp in context. Call list_camps to see the farm's camps and their ids."}
    farm = c.farm
    return {
        "farm": {"farm_id": farm.id, "name": farm.name, "region": farm.region},
        "camp": _camp_public(c),
    }


def list_camps(ctx: ToolContext, farm_id: int | None = None) -> dict:
    fid = farm_id or ctx.default_farm_id
    farm = ctx.db.get(Farm, fid) if fid else None
    if not farm:
        return {"error": "Farm not found."}
    return {
        "source": "farmer-provided",
        "farm": {"farm_id": farm.id, "name": farm.name, "region": farm.region},
        "camps": [_camp_public(c) for c in farm.camps],
    }


def search_dataset(ctx: ToolContext, ecoregion: str | None = None, query: str | None = None) -> dict:
    plots = dataset_service.search_plots(ctx.db, ecoregion=ecoregion, query=query)
    return {
        "source": "historical dataset (research plots)",
        "count": len(plots),
        "plots": plots,
        "note": "These are research observations, not measurements of the farmer's camp.",
    }


def find_comparable_plots(ctx: ToolContext, camp_id: int | None = None, ecoregion: str | None = None) -> dict:
    c = _camp(ctx, camp_id)
    lat = c.latitude if c else None
    lon = c.longitude if c else None
    region = ecoregion or (c.region if c else None)
    refs = matching_service.find_comparable_plots(ctx.db, lat, lon, region)
    return {
        "source": "comparable research plots",
        "references": refs,
        "note": "Ranked by geographic distance and ecoregion. Each item is labelled by how comparable it is.",
    }


def check_rainfall(ctx: ToolContext, camp_id: int | None = None) -> dict:
    c = _camp(ctx, camp_id)
    if not c:
        return {"error": "Camp not found."}
    w = weather_service.get_weather(c.latitude, c.longitude)
    return {
        "source": "live weather (Open-Meteo)" if w["available"] else "live weather unavailable",
        "rainfall_7d_mm": w["rainfall_7d_mm"],
        "rainfall_14d_mm": w["rainfall_14d_mm"],
        "rainfall_30d_mm": w["rainfall_30d_mm"],
        "rainfall_forecast_7d_mm": w["rainfall_forecast_7d_mm"],
        "available": w["available"],
        "note": w["note"],
    }


def check_weather_context(ctx: ToolContext, camp_id: int | None = None) -> dict:
    c = _camp(ctx, camp_id)
    if not c:
        return {"error": "Camp not found."}
    w = weather_service.get_weather(c.latitude, c.longitude)
    drought_hint = None
    if w["available"] and w["rainfall_30d_mm"] is not None:
        if w["rainfall_30d_mm"] < 10:
            drought_hint = "Very little rain in the last 30 days; drought stress is likely."
        elif w["rainfall_30d_mm"] < 40:
            drought_hint = "Below-average recent rainfall; pasture growth may be limited."
        else:
            drought_hint = "Recent rainfall present; some pasture growth is possible."
    return {
        "source": "live weather (Open-Meteo)" if w["available"] else "live weather unavailable",
        "current_temp_c": w["current_temp_c"],
        "forecast_max_temp_c": w["forecast_max_temp_c"],
        "rainfall_30d_mm": w["rainfall_30d_mm"],
        "drought_context": drought_hint,
        "available": w["available"],
        "note": w["note"],
    }


def calculate_livestock_per_hectare(ctx: ToolContext, camp_id: int | None = None) -> dict:
    c = _camp(ctx, camp_id)
    if not c:
        return {"error": "Camp not found."}
    res = calc_service.livestock_per_hectare(c.cattle_count, c.goat_count, c.sheep_count, c.area_ha)
    res["source"] = "deterministic calculation"
    return res


def calculate_grazing_duration(ctx: ToolContext, camp_id: int | None = None) -> dict:
    c = _camp(ctx, camp_id)
    if not c:
        return {"error": "Camp not found."}
    res = calc_service.grazing_duration(c.grazing_start_date)
    res["source"] = "deterministic calculation"
    return res


def get_previous_assessments(ctx: ToolContext, camp_id: int | None = None) -> dict:
    c = _camp(ctx, camp_id)
    if not c:
        return {"error": "Camp not found."}
    items = (
        ctx.db.query(Assessment)
        .filter(Assessment.camp_id == c.id)
        .order_by(Assessment.created_at.desc())
        .limit(5)
        .all()
    )
    return {
        "source": "previous assessments (saved history)",
        "assessments": [
            {
                "id": a.id,
                "date": a.created_at.isoformat() if a.created_at else None,
                "status": a.status,
                "recommendation": a.recommendation,
                "confidence": a.confidence,
            }
            for a in items
        ],
    }


def compare_camps(ctx: ToolContext, camp_ids: list[int]) -> dict:
    out = []
    for cid in camp_ids:
        c = ctx.db.get(Camp, cid)
        if not c:
            continue
        w = weather_service.get_weather(c.latitude, c.longitude)
        calc = calc_service.livestock_per_hectare(c.cattle_count, c.goat_count, c.sheep_count, c.area_ha)
        dur = calc_service.grazing_duration(c.grazing_start_date)
        latest = (
            ctx.db.query(Assessment)
            .filter(Assessment.camp_id == c.id)
            .order_by(Assessment.created_at.desc())
            .first()
        )
        out.append(
            {
                "camp_id": c.id,
                "name": c.name,
                "area_ha": c.area_ha,
                "cattle_count": c.cattle_count,
                "goat_count": c.goat_count,
                "sheep_count": c.sheep_count,
                "lsu_per_ha": calc.get("lsu_per_ha"),
                "days_on_camp": dur.get("days_on_camp"),
                "rainfall_7d_mm": w.get("rainfall_7d_mm"),
                "rainfall_30d_mm": w.get("rainfall_30d_mm"),
                "weather_available": w.get("available"),
                "latest_status": latest.status if latest else None,
                "latest_confidence": latest.confidence if latest else None,
            }
        )
    return {"source": "mixed (farmer-provided, live weather, calculations, history)", "camps": out}


def analyze_photos(ctx: ToolContext, photo_ids: list[int]) -> dict:
    if not photo_ids or ctx.photo_analyzer is None:
        return {"source": "photo observations", "photos": [], "note": "No photos were provided."}
    photos = [p for p in (ctx.db.get(CampPhoto, pid) for pid in photo_ids) if p is not None]
    if not photos:
        return {"source": "photo observations", "photos": [], "note": "No matching photos found."}
    findings = ctx.photo_analyzer(photos)  # type: ignore[operator]
    return {
        "source": "visual photo observations",
        "photos": findings,
        "note": "Photo observations strengthen but do not replace dataset, weather and farmer information.",
    }


DISPATCH = {
    "get_farm_and_camp": get_farm_and_camp,
    "list_camps": list_camps,
    "search_dataset": search_dataset,
    "find_comparable_plots": find_comparable_plots,
    "check_rainfall": check_rainfall,
    "check_weather_context": check_weather_context,
    "calculate_livestock_per_hectare": calculate_livestock_per_hectare,
    "calculate_grazing_duration": calculate_grazing_duration,
    "get_previous_assessments": get_previous_assessments,
    "compare_camps": compare_camps,
    "analyze_photos": analyze_photos,
}


def execute_tool(name: str, args: dict, ctx: ToolContext) -> dict:
    fn = DISPATCH.get(name)
    if fn is None:
        return {"error": f"Unknown tool {name}"}
    if name not in ctx.tools_used:
        ctx.tools_used.append(name)
    try:
        return fn(ctx, **(args or {}))
    except TypeError:
        # tolerate unexpected/missing args from the model
        try:
            return fn(ctx)
        except Exception as exc:  # noqa: BLE001
            return {"error": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return {"error": str(exc)}


def _camp_id_param(desc: str) -> dict:
    return {
        "type": "object",
        "properties": {"camp_id": {"type": "integer", "description": desc}},
    }


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_farm_and_camp",
            "description": "Get the farmer-provided farm and camp information (herd counts, area, coordinates, grazing dates, observations).",
            "parameters": _camp_id_param("Camp id. Omit to use the current camp in context."),
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_camps",
            "description": "List all camps of a farm with their ids, herd counts, areas and grazing dates. Use this first when the question is about the whole farm or multiple camps.",
            "parameters": {
                "type": "object",
                "properties": {"farm_id": {"type": "integer", "description": "Farm id. Omit to use the current farm in context."}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_dataset",
            "description": "Search the historical rangeland research dataset by ecoregion and/or free-text query (site, species). Returns research plot observations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ecoregion": {"type": "string", "description": "Ecoregion name to filter by."},
                    "query": {"type": "string", "description": "Free-text (site name or species)."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_comparable_plots",
            "description": "Find several comparable research plots for a camp, ranked by geographic distance and ecoregion, each labelled by comparability.",
            "parameters": {
                "type": "object",
                "properties": {
                    "camp_id": {"type": "integer", "description": "Camp id. Omit to use current camp."},
                    "ecoregion": {"type": "string", "description": "Optional ecoregion override."},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_rainfall",
            "description": "Get live and forecast rainfall for a camp's coordinates (last 7/14/30 days and next 7 days) from Open-Meteo.",
            "parameters": _camp_id_param("Camp id. Omit to use the current camp."),
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_weather_context",
            "description": "Get current temperature, forecast max temperature and a drought context hint for a camp.",
            "parameters": _camp_id_param("Camp id. Omit to use the current camp."),
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_livestock_per_hectare",
            "description": "Deterministically compute livestock per hectare and a Large Stock Unit estimate (species reported separately).",
            "parameters": _camp_id_param("Camp id. Omit to use the current camp."),
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_grazing_duration",
            "description": "Deterministically compute how many days the herd has been on the camp since the grazing start date.",
            "parameters": _camp_id_param("Camp id. Omit to use the current camp."),
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_previous_assessments",
            "description": "Retrieve up to 5 previous saved assessments for a camp to understand trends.",
            "parameters": _camp_id_param("Camp id. Omit to use the current camp."),
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_camps",
            "description": "Compare two or more camps on area, herd, livestock/ha, grazing duration, rainfall and latest assessment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "camp_ids": {"type": "array", "items": {"type": "integer"}, "description": "Camp ids to compare."}
                },
                "required": ["camp_ids"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_photos",
            "description": "Analyse optional camp photographs for visible conditions. Only call if photo ids were provided in context.",
            "parameters": {
                "type": "object",
                "properties": {
                    "photo_ids": {"type": "array", "items": {"type": "integer"}, "description": "Photo ids to analyse."}
                },
                "required": ["photo_ids"],
            },
        },
    },
]


SUBMIT_ASSESSMENT_SCHEMA = {
    "type": "function",
    "function": {
        "name": "submit_assessment",
        "description": "Submit the final structured assessment. Call exactly once at the end.",
        "parameters": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["Good", "Watch", "High concern", "Insufficient data"],
                },
                "direct_answer": {"type": "string"},
                "recommendation": {"type": "string"},
                "reasons": {"type": "array", "items": {"type": "string"}},
                "evidence": {"type": "array", "items": {"type": "string"}},
                "confidence": {"type": "string", "enum": ["Low", "Moderate", "High"]},
                "limitations": {"type": "array", "items": {"type": "string"}},
                "next_steps": {"type": "array", "items": {"type": "string"}},
            },
            "required": [
                "status",
                "direct_answer",
                "recommendation",
                "reasons",
                "evidence",
                "confidence",
                "limitations",
                "next_steps",
            ],
        },
    },
}
