from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.camp import CampRead


class FarmCreate(BaseModel):
    name: str
    region: str | None = None
    owner_name: str | None = None


class FarmRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    region: str | None = None
    owner_name: str | None = None
    created_at: datetime


class FarmWithCamps(FarmRead):
    camps: list[CampRead] = []
