"""Ownership helpers so web and mobile share the same per-user farm data."""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Camp, Farm
from app.models.user import User


def user_farms(db: Session, user: User) -> list[Farm]:
    return db.query(Farm).filter(Farm.user_id == user.id).order_by(Farm.id).all()


def get_owned_farm(db: Session, user: User, farm_id: int) -> Farm:
    farm = db.get(Farm, farm_id)
    if not farm or farm.user_id != user.id:
        raise HTTPException(404, "Farm not found")
    return farm


def get_owned_camp(db: Session, user: User, camp_id: int) -> Camp:
    camp = db.get(Camp, camp_id)
    if not camp:
        raise HTTPException(404, "Camp not found")
    farm = db.get(Farm, camp.farm_id)
    if not farm or farm.user_id != user.id:
        raise HTTPException(404, "Camp not found")
    return camp
