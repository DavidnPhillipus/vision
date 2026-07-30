"""Ensure farms.user_id exists and orphan farms are linked when possible."""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models import Farm
from app.models.user import User


def ensure_farm_user_link(db: Session) -> None:
    db.execute(
        text(
            """
            ALTER TABLE farms
            ADD COLUMN IF NOT EXISTS user_id INTEGER
            REFERENCES users(id) ON DELETE SET NULL
            """
        )
    )
    db.execute(text("CREATE INDEX IF NOT EXISTS ix_farms_user_id ON farms (user_id)"))
    db.commit()

    # Link farms that still have no owner to a matching user (name / owner).
    orphans = db.query(Farm).filter(Farm.user_id.is_(None)).all()
    if not orphans:
        return

    users = db.query(User).all()
    by_farm_name = {((u.farm_name or "").strip().lower()): u for u in users if u.farm_name}
    by_owner = {(u.full_name or "").strip().lower(): u for u in users}

    for farm in orphans:
        user = by_farm_name.get((farm.name or "").strip().lower()) or by_owner.get(
            (farm.owner_name or "").strip().lower()
        )
        if user:
            farm.user_id = user.id

    db.commit()
