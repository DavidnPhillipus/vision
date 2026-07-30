from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agent import agent
from app.database import get_db
from app.models import ChatMessage
from app.models.user import User
from app.schemas import ChatRequest, ChatResponse
from app.services.auth_service import get_current_user
from app.services.ownership import get_owned_camp, get_owned_farm, user_farms

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    farm_id = payload.farm_id
    camp_id = payload.camp_id
    if farm_id is not None:
        get_owned_farm(db, user, farm_id)
    if camp_id is not None:
        get_owned_camp(db, user, camp_id)
    if farm_id is None and camp_id is None:
        farms = user_farms(db, user)
        if not farms:
            raise HTTPException(400, "Create a farm first so advice can use your data.")
        farm_id = farms[0].id

    db.add(ChatMessage(farm_id=farm_id, camp_id=camp_id, role="user", content=payload.message))
    db.commit()

    result = agent.run_chat(
        db,
        message=payload.message,
        farm_id=farm_id,
        camp_id=camp_id,
        history=payload.history,
    )

    db.add(ChatMessage(farm_id=farm_id, camp_id=camp_id, role="assistant", content=result["reply"]))
    db.commit()
    return ChatResponse(reply=result["reply"], tools_used=result.get("tools_used", []))
