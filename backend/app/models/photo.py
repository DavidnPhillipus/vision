from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CampPhoto(Base):
    __tablename__ = "camp_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    camp_id: Mapped[int] = mapped_column(ForeignKey("camps.id", ondelete="CASCADE"), index=True)
    assessment_id: Mapped[int | None] = mapped_column(
        ForeignKey("assessments.id", ondelete="SET NULL"), nullable=True, index=True
    )

    direction: Mapped[str] = mapped_column(String(20), default="general")
    filename: Mapped[str] = mapped_column(String(300))
    analysis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    camp: Mapped["Camp"] = relationship(back_populates="photos")  # noqa: F821
