"""Load cleaned reference data into Postgres without the Excel dataset folder.

Prefer this on cloud / CI / fresh machines:

  python -m app.etl.load_reference

Uses ``backend/app/data/reference_seed.json`` produced by ``build_reference``.
Falls back to Excel ETL only if the seed is missing and ``dataset/`` exists.
"""

from __future__ import annotations

from app.config import DATASET_DIR
from app.database import Base, engine
import app.models  # noqa: F401
from app.etl.reference_seed import load_reference_seed, seed_path


def main() -> dict:
    Base.metadata.create_all(bind=engine)
    path = seed_path()
    if path.exists():
        return load_reference_seed(path)

    if DATASET_DIR.exists():
        print("No seed file — falling back to Excel ETL from", DATASET_DIR)
        from app.etl.build_reference import build

        return build()

    raise SystemExit(
        "No reference_seed.json and no dataset/ folder. "
        "Commit the seed or restore the Excel dataset and run build_reference."
    )


if __name__ == "__main__":
    main()
