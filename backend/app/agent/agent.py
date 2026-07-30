"""The Vision tool-calling agent: a real LLM function-calling loop (Gemini via the
OpenAI-compatible API by default).

The model decides which tools to call to gather evidence, then emits a structured
assessment via the ``submit_assessment`` tool. Falls back to a deterministic rule-based
assessment when the LLM is unavailable, so the app always works end-to-end.
"""

from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.agent import prompts, tools
from app.agent.fallback import rule_based_assessment
from app.config import settings
from app.models import Camp
from app.services import photo_service
from app.services.llm import get_client as _client

MAX_TOOL_ROUNDS = 8


def _snapshots_from_results(results: dict) -> dict:
    """Extract structured snapshots from captured tool results for storage/UI."""
    snap = {"weather_snapshot": {}, "references": [], "calculations": {}, "photo_findings": []}
    for name, res in results.items():
        if name == "check_rainfall" or name == "check_weather_context":
            snap["weather_snapshot"].update({k: v for k, v in res.items() if k != "source"})
        elif name == "find_comparable_plots":
            snap["references"] = res.get("references", [])
        elif name == "calculate_livestock_per_hectare":
            snap["calculations"]["livestock_per_hectare"] = res
        elif name == "calculate_grazing_duration":
            snap["calculations"]["grazing_duration"] = res
        elif name == "analyze_photos":
            snap["photo_findings"] = res.get("photos", [])
    return snap


def run_assessment(
    db: Session,
    camp: Camp,
    photo_ids: list[int] | None = None,
    question: str | None = None,
) -> dict:
    photo_ids = photo_ids or []

    # Pre-analyse photos (also used by fallback) and cache result on context.
    def analyzer(photos):
        return photo_service.analyze_photos(photos)

    if not settings.openai_enabled:
        photo_findings = []
        if photo_ids:
            from app.models import CampPhoto

            photos = [p for p in (db.get(CampPhoto, pid) for pid in photo_ids) if p]
            photo_findings = photo_service.analyze_photos(photos)
        result = rule_based_assessment(db, camp, photo_findings)
        result["engine"] = "rule-based (no LLM key configured)"
        return result

    ctx = tools.ToolContext(db=db, default_camp_id=camp.id, photo_analyzer=analyzer)
    captured: dict = {}

    user_intro = (
        f"Assess camp id {camp.id} ('{camp.name}'). "
        + (f"Photos were provided with ids {photo_ids}; you may call analyze_photos. " if photo_ids else "No photos were provided; do not call analyze_photos. ")
        + (f"The farmer also asks: {question} " if question else "")
        + "Use tools to gather farmer data, live weather, deterministic calculations and comparable research plots, then submit the assessment."
    )

    messages = [
        {"role": "system", "content": prompts.SYSTEM_PROMPT},
        {"role": "user", "content": user_intro},
    ]

    client = _client()
    all_tools = tools.TOOL_SCHEMAS + [tools.SUBMIT_ASSESSMENT_SCHEMA]

    try:
        for round_i in range(MAX_TOOL_ROUNDS):
            force_submit = round_i == MAX_TOOL_ROUNDS - 1
            resp = client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                tools=all_tools,
                tool_choice=(
                    {"type": "function", "function": {"name": "submit_assessment"}}
                    if force_submit
                    else "auto"
                ),
            )
            msg = resp.choices[0].message
            if not msg.tool_calls:
                # nudge the model to submit
                messages.append({"role": "assistant", "content": msg.content or ""})
                messages.append({"role": "user", "content": prompts.ASSESSMENT_INSTRUCTION})
                continue

            # Replay the full message dump: Gemini's OpenAI-compatible endpoint requires
            # provider extras (e.g. thought_signature) to be echoed back with tool calls.
            messages.append(msg.model_dump(exclude_none=True))

            for tc in msg.tool_calls:
                name = tc.function.name
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}

                if name == "submit_assessment":
                    final = args
                    snaps = _snapshots_from_results(captured)
                    final["weather_snapshot"] = snaps["weather_snapshot"]
                    final["references"] = snaps["references"]
                    final["calculations"] = snaps["calculations"]
                    final["photo_findings"] = snaps["photo_findings"]
                    final["tools_used"] = ctx.tools_used
                    final["engine"] = settings.openai_model
                    return final

                result = tools.execute_tool(name, args, ctx)
                captured[name] = result
                messages.append(
                    {"role": "tool", "tool_call_id": tc.id, "name": name, "content": json.dumps(result, default=str)}
                )
    except Exception as exc:  # noqa: BLE001
        # Any LLM/network failure: fall back so the assessment still completes.
        from app.models import CampPhoto

        photo_findings = []
        if photo_ids:
            photos = [p for p in (db.get(CampPhoto, pid) for pid in photo_ids) if p]
            photo_findings = photo_service.analyze_photos(photos)
        result = rule_based_assessment(db, camp, photo_findings)
        result["engine"] = f"rule-based (LLM error: {type(exc).__name__})"
        return result

    # Loop exhausted without submit (shouldn't happen due to forced submit)
    result = rule_based_assessment(db, camp)
    result["engine"] = "rule-based (fallback)"
    return result


def run_chat(
    db: Session,
    message: str,
    farm_id: int | None = None,
    camp_id: int | None = None,
    history: list[dict] | None = None,
) -> dict:
    history = history or []

    if not settings.openai_enabled:
        return {
            "reply": (
                "The AI advisor needs an API key to hold a conversation. You can still "
                "run assessments, which work with a rule-based engine. Add OPENAI_API_KEY "
                "(a Gemini or OpenAI key) to backend/.env to enable full chat."
            ),
            "tools_used": [],
        }

    ctx = tools.ToolContext(
        db=db,
        default_camp_id=camp_id,
        default_farm_id=farm_id,
        photo_analyzer=lambda ps: photo_service.analyze_photos(ps),
    )

    context_note = ""
    if camp_id:
        camp = db.get(Camp, camp_id)
        if camp:
            context_note = f" The current camp in context is id {camp.id} ('{camp.name}'). "
    if farm_id and not camp_id:
        context_note = (
            f" The current farm in context is id {farm_id}. "
            "Start with list_camps (omit farm_id to use this farm), then compare_camps "
            "or per-camp tools using the returned camp ids."
        )
    elif farm_id and camp_id:
        context_note += f" The farm id is {farm_id}."

    messages = [{"role": "system", "content": prompts.CHAT_SYSTEM_PROMPT + context_note}]
    for h in history[-8:]:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    client = _client()
    try:
        for _ in range(MAX_TOOL_ROUNDS):
            resp = client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                tools=tools.TOOL_SCHEMAS,
                tool_choice="auto",
            )
            msg = resp.choices[0].message
            if not msg.tool_calls:
                return {"reply": msg.content or "", "tools_used": ctx.tools_used}

            # Full dump keeps provider extras (e.g. Gemini thought_signature) intact.
            messages.append(msg.model_dump(exclude_none=True))
            for tc in msg.tool_calls:
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                result = tools.execute_tool(tc.function.name, args, ctx)
                messages.append(
                    {"role": "tool", "tool_call_id": tc.id, "name": tc.function.name, "content": json.dumps(result, default=str)}
                )
    except Exception as exc:  # noqa: BLE001
        return {"reply": f"The advisor had a problem ({type(exc).__name__}). Please try again.", "tools_used": ctx.tools_used}

    return {"reply": "I could not complete that request. Please try rephrasing.", "tools_used": ctx.tools_used}
