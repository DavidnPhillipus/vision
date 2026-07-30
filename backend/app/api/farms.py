from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Assessment, Farm
from app.models.user import User
from app.schemas import FarmCreate, FarmRead, FarmWithCamps
from app.schemas.camp import CampSummary
from app.services.auth_service import get_current_user
from app.services.ownership import get_owned_farm, user_farms

router = APIRouter(prefix="/farms", tags=["farms"])


@router.get("", response_model=list[FarmRead])
def list_farms(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return only farms owned by the signed-in user (shared across web + mobile)."""
    return user_farms(db, user)


@router.post("", response_model=FarmRead, status_code=201)
def create_farm(
    payload: FarmCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    if not data.get("owner_name"):
        data["owner_name"] = user.full_name
    farm = Farm(**data, user_id=user.id)
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return farm


@router.get("/{farm_id}", response_model=FarmWithCamps)
def get_farm(farm_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_owned_farm(db, user, farm_id)


@router.get("/{farm_id}/camps", response_model=list[CampSummary])
def farm_camps(farm_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farm = get_owned_farm(db, user, farm_id)
    out = []
    for c in farm.camps:
        latest = (
            db.query(Assessment)
            .filter(Assessment.camp_id == c.id)
            .order_by(Assessment.created_at.desc())
            .first()
        )
        out.append(
            CampSummary(
                id=c.id,
                name=c.name,
                region=c.region,
                area_ha=c.area_ha,
                cattle_count=c.cattle_count,
                goat_count=c.goat_count,
                sheep_count=c.sheep_count,
                latest_status=latest.status if latest else None,
                latest_confidence=latest.confidence if latest else None,
            )
        )
    return out
