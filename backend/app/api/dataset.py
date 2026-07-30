from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import dataset_service

router = APIRouter(prefix="/dataset", tags=["dataset"])


@router.get("/ecoregions")
def ecoregions(db: Session = Depends(get_db)):
    return dataset_service.list_ecoregions(db)


@router.get("/plots")
def plots(ecoregion: str | None = None, query: str | None = None, db: Session = Depends(get_db)):
    return dataset_service.search_plots(db, ecoregion=ecoregion, query=query, limit=50)


@router.get("/plots/{plot_name}")
def plot(plot_name: str, db: Session = Depends(get_db)):
    p = dataset_service.get_plot(db, plot_name)
    if not p:
        raise HTTPException(404, "Plot not found")
    return {
        "plot": p,
        "cover_rounds": dataset_service.get_cover_rounds(db, plot_name),
        "species": dataset_service.get_species(db, plot_name),
        "photos": dataset_service.get_photo_meta(db, plot_name),
    }


@router.get("/photos/{photo_id}/file")
def reference_photo_file(photo_id: int, db: Session = Depends(get_db)):
    photo = dataset_service.get_photo(db, photo_id)
    if not photo or not photo.image_data:
        raise HTTPException(404, "Reference photo not found in database")
    return Response(
        content=photo.image_data,
        media_type=photo.content_type or "image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/assets")
def assets(db: Session = Depends(get_db)):
    return dataset_service.list_assets(db)


@router.get("/assets/{asset_id}/file")
def asset_file(asset_id: int, db: Session = Depends(get_db)):
    asset = dataset_service.get_asset(db, asset_id)
    if not asset or not asset.data:
        raise HTTPException(404, "Asset not found")
    return Response(
        content=asset.data,
        media_type=asset.content_type,
        headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": f'inline; filename="{asset.filename}"',
        },
    )
