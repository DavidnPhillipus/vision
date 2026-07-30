from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    camp_id: Mapped[int] = mapped_column(ForeignKey("camps.id", ondelete="CASCADE"), index=True)

    status: Mapped[str] = mapped_column(String(40), default="Insufficient data")
    direct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[str | None] = mapped_column(String(40), nullable=True)

    reasons: Mapped[list] = mapped_column(JSONB, default=list)
    evidence: Mapped[list] = mapped_column(JSONB, default=list)
    limitations: Mapped[list] = mapped_column(JSONB, default=list)
    next_steps: Mapped[list] = mapped_column(JSONB, default=list)

    herd_snapshot: Mapped[dict] = mapped_column(JSONB, default=dict)
    weather_snapshot: Mapped[dict] = mapped_column(JSONB, default=dict)
    references: Mapped[list] = mapped_column(JSONB, default=list)
    photo_findings: Mapped[list] = mapped_column(JSONB, default=list)
    calculations: Mapped[dict] = mapped_column(JSONB, default=dict)

    question: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    camp: Mapped["Camp"] = relationship(back_populates="assessments")  # noqa: F821
