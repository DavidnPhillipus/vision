"""Optional multimodal photo analysis using an existing vision-capable model.

Describes visible conditions only, in careful language. Never claims exact biomass,
carrying capacity, grass percentage, or number of grazing days. Also supports comparing
against previously analysed photos to describe possible visual trends.
"""

from __future__ import annotations

import base64
import json

from app.config import settings
from app.models import CampPhoto
from app.services.llm import get_client

PHOTO_SYSTEM = """You describe a rangeland/pasture photograph for a Namibian farmer.
Report ONLY what is visibly plausible, using these buckets and cautious wording. Never give
exact numbers, exact biomass, exact carrying capacity, exact grass percentage, or grazing
days. Return concise JSON with keys:
- grass_density: one of sparse, moderate, dense, uncertain
- vegetation_dryness: one of dry, mixed, green, uncertain
- exposed_soil: one of low, moderate, high, uncertain
- woody_density: one of sparse, moderate, dense, uncertain
- erosion_signs: one of none_visible, possible, likely, uncertain
- livestock_visible: true/false/uncertain
- image_quality: one of good, fair, poor
- summary: one plain-language sentence
- uncertainty: one short sentence on what is unclear"""


def _encode(path: str) -> str | None:
    try:
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    except Exception:  # noqa: BLE001
        return None


def _fallback(direction: str) -> dict:
    return {
        "direction": direction,
        "grass_density": "uncertain",
        "vegetation_dryness": "uncertain",
        "exposed_soil": "uncertain",
        "woody_density": "uncertain",
        "erosion_signs": "uncertain",
        "livestock_visible": "uncertain",
        "image_quality": "uncertain",
        "summary": "Photo analysis is unavailable, so no visual observations were added.",
        "uncertainty": "No visual model result; rely on dataset, weather and farmer information.",
    }


def analyze_photos(photos: list[CampPhoto]) -> list[dict]:
    findings: list[dict] = []
    use_ai = settings.openai_enabled
    client = get_client() if use_ai else None

    for p in photos:
        # reuse cached analysis if present
        if p.analysis:
            findings.append({**p.analysis, "direction": p.direction, "photo_id": p.id})
            continue

        if not use_ai:
            f = _fallback(p.direction)
            f["photo_id"] = p.id
            findings.append(f)
            continue

        path = str(settings.upload_path / p.filename)
        b64 = _encode(path)
        if not b64:
            f = _fallback(p.direction)
            f["photo_id"] = p.id
            findings.append(f)
            continue

        try:
            resp = client.chat.completions.create(
                model=settings.openai_vision_model,
                messages=[
                    {"role": "system", "content": PHOTO_SYSTEM},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"Camp photo facing: {p.direction}. Describe it as JSON."},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                        ],
                    },
                ],
                response_format={"type": "json_object"},
                # Generous budget: Gemini thinking tokens count toward max_tokens.
                max_tokens=2000,
            )
            data = json.loads(resp.choices[0].message.content or "{}")
        except Exception as exc:  # noqa: BLE001
            data = {"summary": f"Photo could not be analysed ({type(exc).__name__}).", "image_quality": "uncertain"}

        data["direction"] = p.direction
        data["photo_id"] = p.id
        findings.append(data)

    return findings


def compare_photo_sets(previous: list[dict], current: list[dict]) -> dict:
    """Describe possible visual trends between an earlier and current photo set."""
    if not previous or not current:
        return {"trend_available": False, "note": "Not enough photo history to describe a visual trend yet."}

    if not settings.openai_enabled:
        return {"trend_available": False, "note": "Visual trend comparison needs the AI model."}

    client = get_client()
    prompt = (
        "You are comparing two sets of rangeland photo observations for the same camp taken "
        "at different times. Describe POSSIBLE visible trends only (grass denser/sparser, "
        "greener/drier, exposed soil increasing, woody vegetation denser). Call them visual "
        "observations or possible trends, never confirmed percentage changes.\n\n"
        f"Earlier observations: {json.dumps(previous)}\n\n"
        f"Current observations: {json.dumps(current)}\n\n"
        "Return JSON with keys: trend_available (true), trends (array of short strings), "
        "caveat (one sentence)."
    )
    try:
        resp = client.chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=2000,
        )
        return json.loads(resp.choices[0].message.content or "{}")
    except Exception as exc:  # noqa: BLE001
        return {"trend_available": False, "note": f"Trend comparison failed ({type(exc).__name__})."}
