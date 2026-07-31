"""Plain-text helpers so farmers never see markdown stars in advice."""

from __future__ import annotations

import re


def strip_markdown(text: str | None) -> str:
    if not text:
        return ""
    out = str(text)
    out = re.sub(r"```[\s\S]*?```", " ", out)
    out = re.sub(r"`([^`]+)`", r"\1", out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"\1", out)
    out = re.sub(r"__([^_]+)__", r"\1", out)
    out = re.sub(r"(^|\W)\*([^*\n]+)\*(?=\W|$)", r"\1\2", out)
    out = re.sub(r"(^|\W)_([^_\n]+)_(?=\W|$)", r"\1\2", out)
    out = re.sub(r"^#{1,6}\s+", "", out, flags=re.MULTILINE)
    out = re.sub(r"^\s*[-*+]\s+", "", out, flags=re.MULTILINE)
    out = re.sub(r"[*#_>~]+", "", out)
    out = re.sub(r"\s+", " ", out).strip()
    return out


def clean_string_list(items: list | None) -> list[str]:
    if not items:
        return []
    cleaned: list[str] = []
    for item in items:
        s = strip_markdown(str(item))
        if s:
            cleaned.append(s)
    return cleaned
