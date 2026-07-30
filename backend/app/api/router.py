from fastapi import APIRouter

from app.api import assessments, auth, camps, chat, compare, dataset, farms, photos

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(farms.router)
api_router.include_router(camps.router)
api_router.include_router(assessments.router)
api_router.include_router(chat.router)
api_router.include_router(compare.router)
api_router.include_router(photos.router)
api_router.include_router(dataset.router)
