from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Camp
from app.models.user import User
from app.schemas import CampCreate, CampRead, CampUpdate
from app.schemas.assessment import AssessmentRead
from app.services import weather_service
from app.services.auth_service import get_current_user
from app.services.ownership import get_owned_camp, get_owned_farm

router = APIRouter(prefix="/camps", tags=["camps"])


@router.post("", response_model=CampRead, status_code=201)
def create_camp(
    payload: CampCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_owned_farm(db, user, payload.farm_id)
    camp = Camp(**payload.model_dump())
    db.add(camp)
    db.commit()
    db.refresh(camp)
    return camp


@router.get("/{camp_id}", response_model=CampRead)
def get_camp(camp_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_owned_camp(db, user, camp_id)


@router.patch("/{camp_id}", response_model=CampRead)
def update_camp(
    camp_id: int,
    payload: CampUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    camp = get_owned_camp(db, user, camp_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(camp, k, v)
    db.commit()
    db.refresh(camp)
    return camp


@router.delete("/{camp_id}", status_code=204)
def delete_camp(camp_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    camp = get_owned_camp(db, user, camp_id)
    db.delete(camp)
    db.commit()


@router.get("/{camp_id}/assessments", response_model=list[AssessmentRead])
def camp_assessments(camp_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    camp = get_owned_camp(db, user, camp_id)
    return camp.assessments


@router.get("/{camp_id}/weather")
def camp_weather(camp_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    camp = get_owned_camp(db, user, camp_id)
    return weather_service.get_weather(camp.latitude, camp.longitude)


@router.get("/{camp_id}/references")
def camp_references(camp_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.services import matching_service

    camp = get_owned_camp(db, user, camp_id)
    return matching_service.find_comparable_plots(db, camp.latitude, camp.longitude, camp.region)
