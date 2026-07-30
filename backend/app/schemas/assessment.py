from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class HerdInput(BaseModel):
    cattle_count: int | None = None
    goat_count: int | None = None
    sheep_count: int | None = None
    other_livestock: str | None = None
    grazing_start_date: date | None = None
    rotational_grazing: bool | None = None
    observations: str | None = None


class AssessmentRequest(BaseModel):
    camp_id: int
    herd: HerdInput | None = None
    photo_ids: list[int] = []
    question: str | None = None


class AssessmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    camp_id: int
    status: str
    direct_answer: str | None = None
    recommendation: str | None = None
    confidence: str | None = None
    reasons: list = []
    evidence: list = []
    limitations: list = []
    next_steps: list = []
    herd_snapshot: dict = {}
    weather_snapshot: dict = {}
    references: list = []
    photo_findings: list = []
    calculations: dict = {}
    question: str | None = None
    created_at: datetime
