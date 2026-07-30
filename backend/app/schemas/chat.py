from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChatRequest(BaseModel):
    farm_id: int | None = None
    camp_id: int | None = None
    message: str
    history: list[dict] = []


class ChatResponse(BaseModel):
    reply: str
    tools_used: list[str] = []


class ChatMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    created_at: datetime
