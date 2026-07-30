from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Camp(Base):
    __tablename__ = "camps"

    id: Mapped[int] = mapped_column(primary_key=True)
    farm_id: Mapped[int] = mapped_column(ForeignKey("farms.id", ondelete="CASCADE"), index=True)

    name: Mapped[str] = mapped_column(String(200))
    region: Mapped[str | None] = mapped_column(String(120), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    area_ha: Mapped[float | None] = mapped_column(Float, nullable=True)

    cattle_count: Mapped[int] = mapped_column(Integer, default=0)
    goat_count: Mapped[int] = mapped_column(Integer, default=0)
    sheep_count: Mapped[int] = mapped_column(Integer, default=0)
    other_livestock: Mapped[str | None] = mapped_column(String(300), nullable=True)

    grazing_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    rotational_grazing: Mapped[bool] = mapped_column(Boolean, default=False)
    observations: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    farm: Mapped["Farm"] = relationship(back_populates="camps")  # noqa: F821
    assessments: Mapped[list["Assessment"]] = relationship(  # noqa: F821
        back_populates="camp", cascade="all, delete-orphan", order_by="Assessment.created_at.desc()"
    )
    photos: Mapped[list["CampPhoto"]] = relationship(  # noqa: F821
        back_populates="camp", cascade="all, delete-orphan"
    )
