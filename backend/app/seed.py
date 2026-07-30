"""Seed a realistic demo farm with four camps that have different conditions.

Run:  python -m app.seed
"""

from __future__ import annotations

from datetime import date, timedelta

from app.database import Base, SessionLocal, engine
import app.models  # noqa: F401
from app.models import Assessment, Camp, CampPhoto, ChatMessage, Farm, User
from app.services import assessment_service
from app.services.auth_service import hash_password

DEMO_FARM_NAME = "Otjiwarongo Demonstration Farm"
DEMO_EMAIL = "demo@vision.na"
DEMO_PASSWORD = "vision123"


def _reset(db):
    db.query(Assessment).delete()
    db.query(CampPhoto).delete()
    db.query(ChatMessage).delete()
    db.query(Camp).delete()
    db.query(Farm).filter(Farm.name == DEMO_FARM_NAME).delete()
    db.commit()


def _ensure_demo_user(db) -> User:
    user = db.query(User).filter(User.email == DEMO_EMAIL).first()
    if user:
        user.password_hash = hash_password(DEMO_PASSWORD)
        user.full_name = "Demo Farmer"
        user.farm_name = DEMO_FARM_NAME
        user.region = "Otjozondjupa"
        return user
    user = User(
        full_name="Demo Farmer",
        email=DEMO_EMAIL,
        password_hash=hash_password(DEMO_PASSWORD),
        farm_name=DEMO_FARM_NAME,
        region="Otjozondjupa",
    )
    db.add(user)
    return user


def seed(run_assessments: bool = True) -> dict:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _reset(db)
        demo_user = _ensure_demo_user(db)
        db.flush()

        farm = Farm(
            name=DEMO_FARM_NAME,
            region="Otjozondjupa",
            owner_name="Demo Farmer",
            user_id=demo_user.id,
        )
        db.add(farm)
        db.flush()

        today = date.today()
        camps = [
            Camp(
                farm_id=farm.id,
                name="North Camp",
                region="Northern Kalahari",
                latitude=-19.52,
                longitude=17.92,
                area_ha=1200,
                cattle_count=140,
                goat_count=20,
                sheep_count=0,
                grazing_start_date=today - timedelta(days=25),
                rotational_grazing=True,
                observations="Grass still visible across most of the camp; a few bare patches near the water point.",
            ),
            Camp(
                farm_id=farm.id,
                name="River Camp",
                region="Northeastern Kalahari woodland",
                latitude=-17.52,
                longitude=16.55,
                area_ha=600,
                cattle_count=180,
                goat_count=60,
                sheep_count=40,
                grazing_start_date=today - timedelta(days=95),
                rotational_grazing=False,
                observations="Herd has been here a long time. Grass looking short and soil showing through in places.",
            ),
            Camp(
                farm_id=farm.id,
                name="Acacia Camp",
                region="Central Kalahari",
                latitude=-22.05,
                longitude=19.10,
                area_ha=900,
                cattle_count=70,
                goat_count=120,
                sheep_count=0,
                grazing_start_date=today - timedelta(days=45),
                rotational_grazing=True,
                observations="Thornbush getting thicker over the years; goats browsing the encroaching bush.",
            ),
            Camp(
                farm_id=farm.id,
                name="Rest Camp",
                region="Karstveld",
                latitude=-19.42,
                longitude=17.88,
                area_ha=800,
                cattle_count=0,
                goat_count=0,
                sheep_count=0,
                grazing_start_date=None,
                rotational_grazing=True,
                observations="Currently rested, no livestock. Recovering grass cover after last season.",
            ),
        ]
        db.add_all(camps)
        db.commit()
        for c in camps:
            db.refresh(c)

        camp_ids = [c.id for c in camps]

        if run_assessments:
            for c in camps:
                try:
                    assessment_service.create_assessment(db, c)
                except Exception as exc:  # noqa: BLE001
                    print(f"  ! assessment failed for {c.name}: {exc}")

        db.commit()
        return {
            "farm_id": farm.id,
            "camp_ids": camp_ids,
            "demo_login": {"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
            "user_id": demo_user.id,
        }
    finally:
        db.close()


if __name__ == "__main__":
    result = seed()
    print("Seed complete:", result)
    print(f"Demo login: {DEMO_EMAIL} / {DEMO_PASSWORD}")
