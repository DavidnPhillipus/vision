"""Run the agent and persist a structured assessment."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.agent import agent
from app.models import Assessment, Camp, CampPhoto


def create_assessment(
    db: Session,
    camp: Camp,
    photo_ids: list[int] | None = None,
    question: str | None = None,
) -> Assessment:
    result = agent.run_assessment(db, camp, photo_ids=photo_ids, question=question)

    herd_snapshot = {
        "cattle_count": camp.cattle_count,
        "goat_count": camp.goat_count,
        "sheep_count": camp.sheep_count,
        "other_livestock": camp.other_livestock,
        "area_ha": camp.area_ha,
        "grazing_start_date": camp.grazing_start_date.isoformat() if camp.grazing_start_date else None,
        "rotational_grazing": camp.rotational_grazing,
        "source": "farmer-provided",
    }

    assessment = Assessment(
        camp_id=camp.id,
        status=result.get("status", "Insufficient data"),
        direct_answer=result.get("direct_answer"),
        recommendation=result.get("recommendation"),
        confidence=result.get("confidence"),
        reasons=result.get("reasons", []),
        evidence=result.get("evidence", []),
        limitations=result.get("limitations", []),
        next_steps=result.get("next_steps", []),
        herd_snapshot=herd_snapshot,
        weather_snapshot=result.get("weather_snapshot", {}),
        references=result.get("references", []),
        photo_findings=result.get("photo_findings", []),
        calculations={**result.get("calculations", {}), "engine": result.get("engine")},
        question=question,
    )
    db.add(assessment)
    db.flush()

    # link any provided photos to this assessment
    if photo_ids:
        for pid in photo_ids:
            p = db.get(CampPhoto, pid)
            if p and p.camp_id == camp.id:
                p.assessment_id = assessment.id
                # cache analysis on the photo for reuse / trend comparison
                for f in result.get("photo_findings", []):
                    if f.get("photo_id") == pid:
                        p.analysis = f

    db.commit()
    db.refresh(assessment)
    return assessment
