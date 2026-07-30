from pydantic import BaseModel


class CompareRequest(BaseModel):
    camp_ids: list[int]


class CompareResponse(BaseModel):
    camps: list[dict]
    conclusion: str
    tools_used: list[str] = []
