from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Assessment
from app.models.user import User
from app.schemas import AssessmentRead, AssessmentRequest
from app.services import assessment_service
from app.services.auth_service import get_current_user
from app.services.ownership import get_owned_camp

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.post("", response_model=AssessmentRead, status_code=201)
def run_assessment(
    payload: AssessmentRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    camp = get_owned_camp(db, user, payload.camp_id)

    if payload.herd:
        data = payload.herd.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(camp, k, v)
        db.commit()
        db.refresh(camp)

    return assessment_service.create_assessment(
        db, camp, photo_ids=payload.photo_ids, question=payload.question
    )


@router.get("/{assessment_id}", response_model=AssessmentRead)
def get_assessment(
    assessment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.get(Assessment, assessment_id)
    if not a:
        raise HTTPException(404, "Assessment not found")
    get_owned_camp(db, user, a.camp_id)
    return a
