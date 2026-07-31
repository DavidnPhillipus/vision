import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agent import tools
from app.config import settings
from app.database import get_db
from app.schemas import CompareRequest, CompareResponse
from app.services.auth_service import get_current_user
from app.services.llm import get_client
from app.services.ownership import get_owned_camp
from app.services.text_clean import strip_markdown
from app.models.user import User

router = APIRouter(prefix="/compare", tags=["compare"])


def _rule_conclusion(camps: list[dict]) -> str:
    if len(camps) < 2:
        return "Add at least two camps to compare."

    def concern_score(c: dict) -> float:
        s = 0.0
        if c.get("lsu_per_ha"):
            s += c["lsu_per_ha"] * 10
        r30 = c.get("rainfall_30d_mm")
        if r30 is not None:
            s += max(0, (40 - r30)) / 10
        status_weight = {"High concern": 3, "Watch": 2, "Good": 0, "Insufficient data": 1}
        s += status_weight.get(c.get("latest_status"), 1)
        return s

    ranked = sorted(camps, key=concern_score, reverse=True)
    worst, best = ranked[0], ranked[-1]
    return (
        f"Based on the available evidence, {worst['name']} currently shows greater concern than "
        f"{best['name']}. {worst['name']} should likely be rested first because it has higher "
        f"livestock pressure and/or lower recent rainfall. This is an estimate; a physical "
        f"inspection would improve confidence."
    )


@router.post("", response_model=CompareResponse)
def compare(
    payload: CompareRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if len(payload.camp_ids) < 2:
        raise HTTPException(400, "Provide at least two camp ids to compare.")

    for camp_id in payload.camp_ids:
        get_owned_camp(db, user, camp_id)

    ctx = tools.ToolContext(db=db)
    data = tools.compare_camps(ctx, payload.camp_ids)
    camps = data["camps"]
    if len(camps) < 2:
        raise HTTPException(404, "Could not find at least two of the requested camps.")

    tools_used = ["compare_camps"]
    if settings.openai_enabled:
        try:
            client = get_client()
            prompt = (
                "You are Vision, a Namibian rangeland advisor. Compare these camps and give ONE "
                "short, practical conclusion for the farmer about which camp to rest first and why "
                "(livestock pressure, rainfall, condition). Use cautious wording and note it is an "
                "estimate. 2-3 sentences. Plain text only — no markdown, no **bold** stars.\n\n"
                + json.dumps(camps, default=str)
            )
            resp = client.chat.completions.create(
                model=settings.openai_model,
                messages=[{"role": "user", "content": prompt}],
                # Generous budget: Gemini thinking tokens count toward max_tokens.
                max_tokens=2000,
            )
            conclusion = resp.choices[0].message.content or _rule_conclusion(camps)
            tools_used.append(settings.openai_model)
        except Exception:  # noqa: BLE001
            conclusion = _rule_conclusion(camps)
    else:
        conclusion = _rule_conclusion(camps)

    return CompareResponse(
        camps=camps,
        conclusion=strip_markdown(conclusion),
        tools_used=tools_used,
    )

