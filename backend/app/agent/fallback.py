"""Deterministic rule-based assessment used when the LLM is unavailable.

Keeps the app fully functional end-to-end without an API key. Uses the same evidence
sources (farmer data, live weather, comparable plots, calculations) and the same cautious,
explainable output shape.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Camp
from app.services import calc_service, matching_service, weather_service


def rule_based_assessment(db: Session, camp: Camp, photo_findings: list[dict] | None = None) -> dict:
    calc = calc_service.livestock_per_hectare(camp.cattle_count, camp.goat_count, camp.sheep_count, camp.area_ha)
    dur = calc_service.grazing_duration(camp.grazing_start_date)
    weather = weather_service.get_weather(camp.latitude, camp.longitude)
    refs = matching_service.find_comparable_plots(db, camp.latitude, camp.longitude, camp.region)

    reasons: list[str] = []
    evidence: list[str] = []
    limitations: list[str] = [
        "This assessment does not include a direct physical biomass measurement from the camp.",
    ]
    concern = 0
    known_signals = 0

    total_livestock = (camp.cattle_count or 0) + (camp.goat_count or 0) + (camp.sheep_count or 0)
    has_herd = total_livestock > 0

    # livestock pressure
    lsu_ha = calc.get("lsu_per_ha")
    if not has_herd:
        known_signals += 1
        reasons.append("No livestock are currently on this camp, so there is no grazing pressure right now.")
        evidence.append("farmer-provided: no livestock currently on camp")
    elif lsu_ha is not None:
        known_signals += 1
        evidence.append(f"calculation: {lsu_ha} LSU per hectare (est.)")
        if lsu_ha >= 0.25:
            concern += 2
            reasons.append("Estimated livestock pressure per hectare is relatively high.")
        elif lsu_ha >= 0.12:
            concern += 1
            reasons.append("Estimated livestock pressure per hectare is moderate.")
        else:
            reasons.append("Estimated livestock pressure per hectare is relatively low.")
    else:
        limitations.append("Camp area is unknown, so grazing pressure per hectare could not be calculated.")

    if has_herd:
        evidence.append(
            f"farmer-provided: {camp.cattle_count or 0} cattle, {camp.goat_count or 0} goats, {camp.sheep_count or 0} sheep"
        )

    # rainfall (a growth-limiter; weighed more heavily when a herd is present)
    if weather["available"]:
        r30 = weather["rainfall_30d_mm"]
        r7 = weather["rainfall_7d_mm"]
        evidence.append(f"live weather: {r7} mm rain last 7 days, {r30} mm last 30 days")
        if r30 is not None:
            known_signals += 1
            if r30 < 10:
                concern += 2 if has_herd else 1
                reasons.append("Very little rain in the last 30 days suggests limited pasture regrowth.")
            elif r30 < 40:
                concern += 1 if has_herd else 0
                reasons.append("Below-average recent rainfall may be limiting pasture growth.")
            else:
                reasons.append("Recent rainfall has been reasonable, supporting some pasture growth.")
    else:
        limitations.append("Live weather was unavailable, so rainfall context is missing.")

    # comparable plots
    if refs:
        known_signals += 1
        top = refs[0]
        evidence.append(
            f"comparable research plot {top['plot_name']} ({top['comparability']}): "
            f"grass cover {top.get('grass_cover_pct')}%, bare ground {top.get('bare_ground_pct')}%"
        )
        grass_vals = [r["grass_cover_pct"] for r in refs if r.get("grass_cover_pct") is not None]
        if grass_vals:
            avg_grass = sum(grass_vals) / len(grass_vals)
            if avg_grass < 25:
                concern += 1
                reasons.append("Comparable research plots show low grass cover under similar conditions.")
            else:
                reasons.append("Comparable research plots show moderate grass cover under similar conditions.")

    # photos (optional)
    if photo_findings:
        for f in photo_findings:
            if f.get("grass_density") == "sparse":
                concern += 1
                reasons.append("A camp photo appears to show sparse grass cover.")
            if f.get("exposed_soil") == "high":
                concern += 1
                reasons.append("A camp photo appears to show high exposed soil.")
            evidence.append(f"visual photo observation ({f.get('direction', 'general')}): {f.get('summary', '')}")

    # status
    if known_signals == 0:
        status = "Insufficient data"
        confidence = "Low"
    elif not has_herd:
        # A rested camp is judged on recovery, not grazing pressure.
        status = "Watch" if concern >= 2 else "Good"
        confidence = "Low" if known_signals < 2 else "Moderate"
    elif concern >= 4:
        status = "High concern"
        confidence = "Moderate"
    elif concern >= 2:
        status = "Watch"
        confidence = "Moderate"
    else:
        status = "Good"
        confidence = "Low" if known_signals < 2 else "Moderate"

    if not has_herd:
        recommendation = (
            "This camp is currently rested. Let it keep recovering and re-check grass cover after "
            "the next rains before returning livestock."
        )
    elif status == "High concern":
        recommendation = "Consider resting this camp soon and moving the herd; arrange a physical inspection."
    elif status == "Watch":
        recommendation = "Consider rotating the herd soon and inspect the camp again after the next rainfall period."
    elif status == "Good":
        recommendation = "Grazing can likely continue for now; keep monitoring rainfall and grass condition."
    else:
        recommendation = "Gather more information (camp area, coordinates, recent rainfall) before deciding."

    next_steps = [
        "Walk the camp and check grass height and bare patches directly.",
        "Re-check after the next rain to see how pasture responds.",
    ]
    if has_herd and status in ("High concern", "Watch"):
        next_steps.append("Consult a rangeland extension officer before a major stocking decision.")

    if dur.get("days_on_camp") is not None:
        evidence.append(f"calculation: herd on camp for {dur['days_on_camp']} days")

    direct_answer = (
        f"Based on the available evidence, this camp currently appears to be '{status}'. "
        "This is an estimate; direct field measurements would improve confidence."
    )

    return {
        "status": status,
        "direct_answer": direct_answer,
        "recommendation": recommendation,
        "reasons": reasons or ["Limited evidence was available for this camp."],
        "evidence": evidence,
        "confidence": confidence,
        "limitations": limitations,
        "next_steps": next_steps,
        "weather_snapshot": weather,
        "references": refs,
        "calculations": {"livestock_per_hectare": calc, "grazing_duration": dur},
        "photo_findings": photo_findings or [],
        "tools_used": [
            "calculate_livestock_per_hectare",
            "calculate_grazing_duration",
            "check_rainfall",
            "find_comparable_plots",
        ],
    }
