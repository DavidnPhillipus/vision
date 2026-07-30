"""Load research photos + manuals/maps from dataset/ into Postgres BYTEA columns.

Run after structured ETL (or alone if photo meta rows already exist):

  python -m app.etl.load_reference_media

Images are resized (max edge 1600px) and re-encoded as JPEG ~quality 82 so the
DB stays portable for cloud dumps while keeping usable research photos.
"""

from __future__ import annotations

import io
import re
from pathlib import Path

from PIL import Image
from sqlalchemy import func

from app.config import DATASET_DIR
from app.database import Base, SessionLocal, engine
import app.models  # noqa: F401
from app.models import ReferenceAsset, ReferencePhotoMeta, ReferencePlot

PICTURES_DIR = DATASET_DIR / "pictures" / "pictures"
SUPPORT_DIR = DATASET_DIR / "supportive_material" / "supportive_material"
MAX_EDGE = 1600
JPEG_QUALITY = 82
PHOTO_RE = re.compile(
    r"^(?P<plot>[A-Za-z]+_\d+)_(?P<dir>north|east|south|west)_(?P<round>.+)\.(jpe?g)$",
    re.IGNORECASE,
)


def _clean_plot_name(value: str | None) -> str | None:
    if not value:
        return None
    s = value.strip().lower()
    if re.fullmatch(r"[a-z]{3,5}_\d+", s):
        return s
    return None


def _compress_image(raw: bytes) -> tuple[bytes, str]:
    """Return (jpeg_bytes, content_type). Falls back to original bytes if unreadable."""
    try:
        img = Image.open(io.BytesIO(raw))
        img = img.convert("RGB")
        img.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        return buf.getvalue(), "image/jpeg"
    except Exception:  # noqa: BLE001
        return raw, "application/octet-stream"


def _upsert_photo(session, path: Path) -> str:
    raw = path.read_bytes()
    original_size = len(raw)
    data, content_type = _compress_image(raw)

    m = PHOTO_RE.match(path.name)
    plot = direction = rnd = None
    if m:
        plot = _clean_plot_name(m.group("plot"))
        direction = m.group("dir").lower()
        rnd = m.group("round").lower().strip("._")

    row = session.query(ReferencePhotoMeta).filter_by(filename=path.name).one_or_none()
    if row is None:
        row = ReferencePhotoMeta(filename=path.name)
        session.add(row)

    row.plot_name = plot
    row.direction = direction
    row.round = rnd
    row.content_type = content_type
    row.original_byte_size = original_size
    row.byte_size = len(data)
    row.image_data = data
    return "ok"


def _load_photos(session) -> dict:
    if not PICTURES_DIR.exists():
        raise FileNotFoundError(f"Pictures folder not found: {PICTURES_DIR}")

    files = sorted(
        p for p in PICTURES_DIR.iterdir() if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg"}
    )
    loaded = 0
    failed: list[str] = []
    original_total = 0
    stored_total = 0

    for i, path in enumerate(files, start=1):
        try:
            _upsert_photo(session, path)
            row = session.query(ReferencePhotoMeta).filter_by(filename=path.name).one()
            original_total += row.original_byte_size or 0
            stored_total += row.byte_size or 0
            loaded += 1
        except Exception as exc:  # noqa: BLE001
            failed.append(f"{path.name}: {exc}")
        if i % 25 == 0:
            session.commit()
            print(f"  … photos {i}/{len(files)}")

    session.commit()

    # Refresh plot photo_count from catalog rows that have bytes.
    counts = (
        session.query(ReferencePhotoMeta.plot_name, func.count(ReferencePhotoMeta.id))
        .filter(ReferencePhotoMeta.image_data.is_not(None))
        .filter(ReferencePhotoMeta.plot_name.is_not(None))
        .group_by(ReferencePhotoMeta.plot_name)
        .all()
    )
    count_map = {plot: n for plot, n in counts}
    for plot in session.query(ReferencePlot).all():
        plot.photo_count = count_map.get(plot.plot_name, 0)
    session.commit()

    return {
        "photos_loaded": loaded,
        "photos_failed": len(failed),
        "failures": failed[:20],
        "original_mb": round(original_total / (1024 * 1024), 1),
        "stored_mb": round(stored_total / (1024 * 1024), 1),
    }


def _store_asset(
    session,
    *,
    path: Path,
    kind: str,
    title: str,
    content_type: str,
    compress_image: bool = False,
) -> None:
    raw = path.read_bytes()
    if compress_image and content_type.startswith("image/"):
        data, content_type = _compress_image(raw)
    else:
        data = raw

    row = session.query(ReferenceAsset).filter_by(filename=path.name).one_or_none()
    if row is None:
        row = ReferenceAsset(
            kind=kind,
            filename=path.name,
            title=title,
            content_type=content_type,
            byte_size=len(data),
            data=data,
        )
        session.add(row)
    else:
        row.kind = kind
        row.title = title
        row.content_type = content_type
        row.byte_size = len(data)
        row.data = data


def _load_assets(session) -> dict:
    stored = 0
    # Prefer the supportive copy of the manual; fall back to root.
    manuals = []
    for candidate in (
        SUPPORT_DIR / "Dataset End User Manual (1) (1).pdf",
        DATASET_DIR / "Dataset End User Manual (1) (1).pdf",
    ):
        if candidate.exists():
            manuals.append(candidate)
            break
    for path in manuals:
        _store_asset(
            session,
            path=path,
            kind="manual",
            title="Namibia Rangeland & Pasture Dataset — End User Manual",
            content_type="application/pdf",
        )
        stored += 1

    maps_dir = SUPPORT_DIR / "maps"
    if maps_dir.exists():
        for path in sorted(maps_dir.glob("*.jpg")) + sorted(maps_dir.glob("*.jpeg")):
            _store_asset(
                session,
                path=path,
                kind="map",
                title=path.stem,
                content_type="image/jpeg",
                compress_image=True,
            )
            stored += 1

    session.commit()
    return {"assets_loaded": stored}


def load_media() -> dict:
    if not DATASET_DIR.exists():
        raise FileNotFoundError(
            f"dataset/ not found at {DATASET_DIR}. "
            "Media must be loaded once from the raw folder into Postgres before you delete it."
        )

    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        print("Loading research media into Postgres from", DATASET_DIR)
        photo_stats = _load_photos(session)
        asset_stats = _load_assets(session)
        result = {**photo_stats, **asset_stats}
        print("Media load complete:", result)
        return result
    finally:
        session.close()


if __name__ == "__main__":
    load_media()
