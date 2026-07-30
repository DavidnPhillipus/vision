"""Shared LLM client. Uses the OpenAI SDK against any OpenAI-compatible endpoint
(default: Google Gemini's OpenAI-compatible API)."""

from openai import OpenAI

from app.config import settings


def get_client() -> OpenAI:
    kwargs: dict = {"api_key": settings.openai_api_key}
    base = (settings.openai_base_url or "").strip()
    if base:
        kwargs["base_url"] = base
    return OpenAI(**kwargs)
