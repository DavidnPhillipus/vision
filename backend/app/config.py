from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
DATASET_DIR = PROJECT_ROOT / "dataset"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM provider (OpenAI-compatible API). Defaults target Google Gemini's
    # OpenAI-compatible endpoint; set base_url to None/empty for api.openai.com.
    openai_api_key: str = "your-key-here"
    openai_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    # flash-lite: solid tool calling with generous free-tier quota.
    # gemini-3.6-flash is smarter but free tier allows only ~20 requests/day.
    openai_model: str = "gemini-3.1-flash-lite"
    openai_vision_model: str = "gemini-3.1-flash-lite"
    database_url: str = "postgresql+psycopg2://vision:vision@localhost:5433/vision"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081,http://127.0.0.1:8081"
    upload_dir: str = "uploads"
    jwt_secret: str = "vision-hackathon-dev-secret-change-me"
    jwt_expire_days: int = 14

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def openai_enabled(self) -> bool:
        key = (self.openai_api_key or "").strip()
        return len(key) > 10 and key not in {"sk-your-key-here", "your-key-here"}

    @property
    def upload_path(self) -> Path:
        p = BASE_DIR / self.upload_dir
        p.mkdir(parents=True, exist_ok=True)
        return p


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
