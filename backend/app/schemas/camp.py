from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class CampBase(BaseModel):
    name: str
    region: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    area_ha: float | None = None
    cattle_count: int = 0
    goat_count: int = 0
    sheep_count: int = 0
    other_livestock: str | None = None
    grazing_start_date: date | None = None
    rotational_grazing: bool = False
    observations: str | None = None


class CampCreate(CampBase):
    farm_id: int


class CampUpdate(BaseModel):
    name: str | None = None
    region: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    area_ha: float | None = None
    cattle_count: int | None = None
    goat_count: int | None = None
    sheep_count: int | None = None
    other_livestock: str | None = None
    grazing_start_date: date | None = None
    rotational_grazing: bool | None = None
    observations: str | None = None


class CampRead(CampBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    farm_id: int
    created_at: datetime


class CampSummary(BaseModel):
    """Lightweight camp view for dashboard lists."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    region: str | None = None
    area_ha: float | None = None
    cattle_count: int = 0
    goat_count: int = 0
    sheep_count: int = 0
    latest_status: str | None = None
    latest_confidence: str | None = None
