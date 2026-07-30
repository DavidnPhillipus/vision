from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401  (register models)
from app.api.router import api_router
from app.config import settings
from app.database import Base, engine

app = FastAPI(title="Vision - Rangeland & Livestock Advisor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    # Create tables if they do not exist (Alembic migrations also provided).
    Base.metadata.create_all(bind=engine)
    from app.database import SessionLocal
    from app.services.schema_sync import ensure_farm_user_link

    db = SessionLocal()
    try:
        ensure_farm_user_link(db)
    finally:
        db.close()


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "ai_enabled": settings.openai_enabled,
        "ai_provider": "gemini" if "generativelanguage.googleapis.com" in (settings.openai_base_url or "") else "openai-compatible",
        "ai_model": settings.openai_model,
        "ai_base_url": settings.openai_base_url,
    }


app.include_router(api_router)
