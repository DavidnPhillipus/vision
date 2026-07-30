import io
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import CampPhoto
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.ownership import get_owned_camp

router = APIRouter(prefix="/photos", tags=["photos"])

VALID_DIRECTIONS = {"general", "north", "east", "south", "west"}
MAX_DIM = 1280


@router.post("", status_code=201)
async def upload_photo(
    camp_id: int = Form(...),
    direction: str = Form("general"),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_owned_camp(db, user, camp_id)
    if direction not in VALID_DIRECTIONS:
        direction = "general"

    raw = await file.read()
    try:
        img = Image.open(io.BytesIO(raw))
        img = img.convert("RGB")
        img.thumbnail((MAX_DIM, MAX_DIM))
    except Exception:  # noqa: BLE001
        raise HTTPException(400, "Uploaded file is not a readable image.")

    filename = f"camp{camp_id}_{direction}_{uuid.uuid4().hex[:8]}.jpg"
    img.save(settings.upload_path / filename, format="JPEG", quality=72, optimize=True)

    photo = CampPhoto(camp_id=camp_id, direction=direction, filename=filename)
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return {"id": photo.id, "camp_id": camp_id, "direction": direction, "filename": filename}


@router.get("/{photo_id}/file")
def get_photo_file(
    photo_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    photo = db.get(CampPhoto, photo_id)
    if not photo:
        raise HTTPException(404, "Photo not found")
    get_owned_camp(db, user, photo.camp_id)
    path = settings.upload_path / photo.filename
    if not path.exists():
        raise HTTPException(404, "Image file missing")
    return FileResponse(path, media_type="image/jpeg")


@router.get("/camp/{camp_id}")
def list_camp_photos(
    camp_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    camp = get_owned_camp(db, user, camp_id)
    return [
        {
            "id": p.id,
            "direction": p.direction,
            "filename": p.filename,
            "assessment_id": p.assessment_id,
            "analysis": p.analysis,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in camp.photos
    ]
