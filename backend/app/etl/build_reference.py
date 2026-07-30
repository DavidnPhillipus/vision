"""ETL: mine the Namibia Rangeland dataset Excel (+ photo catalog) into Postgres.

One-time (or re-run) job. After this succeeds, Vision runtime and cloud deploys use
Postgres / the committed JSON seed only — the ~4 GB ``dataset/`` folder is not required.

Run:
  python -m app.etl.build_reference          # needs dataset/ present
  python -m app.etl.build_reference --export-only   # export DB -> seed (no Excel)
"""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

from app.config import DATASET_DIR
from app.database import SessionLocal, engine
from app.etl.reference_seed import export_reference_seed
from app.models import ReferenceCoverRound, ReferencePhotoMeta, ReferencePlot, ReferenceSpecies

COVER_DIR = DATASET_DIR / "fieldform_cover" / "fieldform_cover"
GRAZING_DIR = DATASET_DIR / "fieldform_grazing" / "fieldform_grazing"
QUANT_DIR = DATASET_DIR / "fieldform_quant" / "fieldform_quant"
STANDING_DIR = DATASET_DIR / "fieldform_standing" / "fieldform_standing"
OTHER_DIR = DATASET_DIR / "other_data" / "other_data"
SUPPORT_DIR = DATASET_DIR / "supportive_material" / "supportive_material"
PICTURES_DIR = DATASET_DIR / "pictures" / "pictures"

ROUND_PATTERNS = ["feb_23", "may_23", "feb_24", "april_24", "may_24"]
PHOTO_RE = re.compile(
    r"^(?P<plot>[A-Za-z]+_\d+)_(?P<dir>north|east|south|west)_(?P<round>.+)\.(jpe?g)$",
    re.IGNORECASE,
)


def _norm_cols(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    return df


def _to_num(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def _plot_round(filename: str) -> str | None:
    lower = filename.lower()
    for r in ROUND_PATTERNS:
        if r in lower:
            return r
    return None


def _clean_plot_name(value) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    s = str(value).strip().lower()
    if re.fullmatch(r"[a-z]{3,5}_\d+", s):
        return s
    return None


def _site_prefix(plot_name: str) -> str:
    return plot_name.rsplit("_", 1)[0]


def _clean_text(value, limit: int | None = None) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    s = str(value).strip()
    if s in {"", ".", "nan", "None", "N/A", "NotApp"}:
        return None
    if limit:
        return s[:limit]
    return s


def _parse_rain_mm(value) -> float | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace(",", ".")
    m = re.search(r"(\d+(?:\.\d+)?)", s)
    return float(m.group(1)) if m else None


# --------------------------------------------------------------------------- cover
def load_cover() -> tuple[pd.DataFrame, pd.DataFrame]:
    rows: list[dict] = []
    for f in sorted(COVER_DIR.glob("*.xlsx")):
        rnd = _plot_round(f.name)
        try:
            df = _norm_cols(pd.read_excel(f))
        except Exception as exc:  # noqa: BLE001
            print(f"  ! skip cover {f.name}: {exc}")
            continue
        if "functional_group" not in df.columns or "presence" not in df.columns:
            continue
        df["plot_name"] = df.get("plot_name").astype(str).str.strip().str.lower()
        df["presence"] = _to_num(df["presence"]).fillna(0)
        df["functional_group"] = df["functional_group"].astype(str).str.strip().str.lower()

        grp = df.groupby(["plot_name", "functional_group"])["presence"].mean().reset_index()
        for _, r in grp.iterrows():
            plot = _clean_plot_name(r["plot_name"])
            if not plot:
                continue
            rows.append(
                {
                    "plot_name": plot,
                    "round": rnd,
                    "functional_group": r["functional_group"],
                    "cover_pct": round(float(r["presence"]) * 100, 1),
                }
            )

    if not rows:
        return pd.DataFrame(), pd.DataFrame()

    long = pd.DataFrame(rows)

    def pivot(frame: pd.DataFrame, keys: list[str]) -> pd.DataFrame:
        wide = (
            frame.pivot_table(index=keys, columns="functional_group", values="cover_pct", aggfunc="mean")
            .reset_index()
        )
        wide.columns.name = None
        for col in [
            "perennial_grass",
            "annual_grass",
            "bare_ground",
            "litter",
            "tree",
            "shrub",
            "short_shrub",
        ]:
            if col not in wide.columns:
                wide[col] = pd.NA
        wide["perennial_grass_pct"] = _to_num(wide["perennial_grass"])
        wide["annual_grass_pct"] = _to_num(wide["annual_grass"])
        wide["grass_cover_pct"] = (
            wide[["perennial_grass_pct", "annual_grass_pct"]].sum(axis=1, min_count=1).clip(upper=100)
        )
        wide["bare_ground_pct"] = _to_num(wide["bare_ground"])
        wide["litter_pct"] = _to_num(wide["litter"])
        wide["woody_cover_pct"] = (
            wide[["tree", "shrub", "short_shrub"]].apply(_to_num).sum(axis=1, min_count=1).clip(upper=100)
        )
        return wide

    per_round = pivot(long, ["plot_name", "round"])
    overall = pivot(long, ["plot_name"])
    return overall, per_round


# ---------------------------------------------------------------------- standing
def load_standing() -> pd.DataFrame:
    rows = []
    for f in sorted(STANDING_DIR.glob("*.xlsx")):
        try:
            df = _norm_cols(pd.read_excel(f))
        except Exception as exc:  # noqa: BLE001
            print(f"  ! skip standing {f.name}: {exc}")
            continue
        if "plot_name" not in df.columns or "standing_crop_estimate" not in df.columns:
            continue
        df["plot_name"] = df["plot_name"].astype(str).str.strip().str.lower()
        df["standing_crop_estimate"] = _to_num(df["standing_crop_estimate"])
        grp = df.groupby("plot_name")["standing_crop_estimate"].mean().reset_index()
        for _, r in grp.iterrows():
            plot = _clean_plot_name(r["plot_name"])
            if plot and pd.notna(r["standing_crop_estimate"]):
                rows.append(
                    {
                        "plot_name": plot,
                        "standing_crop_estimate": round(float(r["standing_crop_estimate"]), 2),
                    }
                )
    return pd.DataFrame(rows)


# ----------------------------------------------------------------------- biomass
def load_biomass() -> pd.DataFrame:
    f = OTHER_DIR / "Biomass.xlsx"
    if not f.exists():
        return pd.DataFrame()
    try:
        df = _norm_cols(pd.read_excel(f))
    except Exception as exc:  # noqa: BLE001
        print(f"  ! skip biomass: {exc}")
        return pd.DataFrame()
    if "plot_name" not in df.columns:
        return pd.DataFrame()
    df["plot_name"] = df["plot_name"].astype(str).str.strip().str.lower()
    df["biomass_before"] = _to_num(df.get("biomass_before"))
    df["biomass_after"] = _to_num(df.get("biomass_after"))
    df["clipped"] = (df["biomass_before"] - df["biomass_after"]).abs()
    grp = df.groupby("plot_name")["clipped"].mean().reset_index()
    rows = []
    for _, r in grp.iterrows():
        plot = _clean_plot_name(r["plot_name"])
        if plot and pd.notna(r["clipped"]):
            rows.append({"plot_name": plot, "biomass_clipped": round(float(r["clipped"]), 2)})
    return pd.DataFrame(rows)


# ------------------------------------------------------------------------- quant
def load_quant() -> pd.DataFrame:
    rows = []
    for f in sorted(QUANT_DIR.glob("*.xlsx")):
        try:
            df = _norm_cols(pd.read_excel(f))
        except Exception as exc:  # noqa: BLE001
            print(f"  ! skip quant {f.name}: {exc}")
            continue
        if "plot_name" not in df.columns:
            continue
        df["plot_name"] = df["plot_name"].astype(str).str.strip().str.lower()
        df["height"] = _to_num(df.get("height"))
        df["seedlings_number"] = _to_num(df.get("seedlings_number"))
        grp = (
            df.groupby("plot_name")
            .agg(woody_mean_height=("height", "mean"), woody_seedlings=("seedlings_number", "mean"))
            .reset_index()
        )
        for _, r in grp.iterrows():
            plot = _clean_plot_name(r["plot_name"])
            if not plot:
                continue
            rows.append(
                {
                    "plot_name": plot,
                    "woody_mean_height": None
                    if pd.isna(r["woody_mean_height"])
                    else round(float(r["woody_mean_height"]), 2),
                    "woody_seedlings": None
                    if pd.isna(r["woody_seedlings"])
                    else round(float(r["woody_seedlings"]), 2),
                }
            )
    return pd.DataFrame(rows)


# ----------------------------------------------------------------------- grazing
def load_grazing() -> pd.DataFrame:
    rows = []
    for f in sorted(GRAZING_DIR.glob("*.xlsx")):
        try:
            df = _norm_cols(pd.read_excel(f))
        except Exception as exc:  # noqa: BLE001
            print(f"  ! skip grazing {f.name}: {exc}")
            continue
        if "plot_name" not in df.columns:
            continue
        df["plot_name"] = df["plot_name"].astype(str).str.strip().str.lower()
        for col in ["number_cattle", "number_goat", "number_sheep", "area", "lat", "long"]:
            if col in df.columns:
                df[col] = _to_num(df[col])
        for _, r in df.iterrows():
            plot = _clean_plot_name(r["plot_name"])
            if not plot:
                continue

            rain_raw = r.get("rainfall")
            rain_records = r.get("rainfall_records")
            rain_comments = r.get("rainfall_comments")
            rain_mm = _parse_rain_mm(rain_raw)
            note_parts = [
                p
                for p in (
                    _clean_text(rain_raw, 120),
                    _clean_text(rain_records, 120),
                    _clean_text(rain_comments, 160),
                )
                if p
            ]
            rain_note = "; ".join(dict.fromkeys(note_parts))[:400] or None

            game_parts = []
            if _clean_text(r.get("game_presence")):
                game_parts.append(f"presence={_clean_text(r.get('game_presence'))}")
            for animal in ("oryx", "kudu", "springbok", "hartebeest", "zebra", "warthog", "others"):
                key = f"number_{animal}"
                val = r.get(key)
                if pd.notna(val) and str(val).strip() not in {"", "0", "0.0"}:
                    game_parts.append(f"{animal}={val}")
            if _clean_text(r.get("game_comments")):
                game_parts.append(_clean_text(r.get("game_comments"), 200) or "")
            game_note = "; ".join(game_parts)[:800] or None

            # Grazing forms use correct Namibian lat/long (unlike coordinates.xlsx).
            lat = r.get("lat")
            lon = r.get("long")
            if pd.isna(lat):
                lat = None
            if pd.isna(lon):
                lon = None

            rows.append(
                {
                    "plot_name": plot,
                    "area_ha": None if pd.isna(r.get("area")) else float(r.get("area")),
                    "cattle_count": None if pd.isna(r.get("number_cattle")) else int(r.get("number_cattle")),
                    "goat_count": None if pd.isna(r.get("number_goat")) else int(r.get("number_goat")),
                    "sheep_count": None if pd.isna(r.get("number_sheep")) else int(r.get("number_sheep")),
                    "rotational_grazing": _clean_text(r.get("rotational_grazing"), 20),
                    "rainfall_note": rain_note,
                    "rainfall_mm": rain_mm,
                    "livestock_comments": _clean_text(r.get("livestock_comments"), 800),
                    "grazing_comments": _clean_text(r.get("grazing_comments"), 800),
                    "game_note": game_note,
                    "other_comments": _clean_text(r.get("other_comments"), 800),
                    "latitude": float(lat) if lat is not None else None,
                    "longitude": float(lon) if lon is not None else None,
                }
            )
    if not rows:
        return pd.DataFrame()
    df = pd.DataFrame(rows)
    return df.groupby("plot_name", as_index=False).first()


# --------------------------------------------------------------- dominant species
def load_species() -> pd.DataFrame:
    f = OTHER_DIR / "dominant_species.xlsx"
    if not f.exists():
        return pd.DataFrame()
    try:
        df = _norm_cols(pd.read_excel(f))
    except Exception as exc:  # noqa: BLE001
        print(f"  ! skip dominant_species: {exc}")
        return pd.DataFrame()
    if "plot_name" not in df.columns or "species_name" not in df.columns:
        return pd.DataFrame()
    rows = []
    for _, r in df.iterrows():
        plot = _clean_plot_name(r["plot_name"])
        species = _clean_text(r.get("species_name"), 200)
        plant_type = _clean_text(r.get("plant_type"), 40) or "unknown"
        if not plot or not species:
            continue
        # Normalize species labels: Stipagrostis_uniplumis -> Stipagrostis uniplumis
        species = species.replace("_", " ")
        rows.append({"plot_name": plot, "plant_type": plant_type.lower(), "species_name": species})
    return pd.DataFrame(rows).drop_duplicates()


# ----------------------------------------------------------------- photo catalog
def load_photo_catalog() -> pd.DataFrame:
    if not PICTURES_DIR.exists():
        return pd.DataFrame()
    rows = []
    for f in sorted(PICTURES_DIR.iterdir()):
        if not f.is_file():
            continue
        if f.suffix.lower() not in {".jpg", ".jpeg"}:
            continue
        m = PHOTO_RE.match(f.name)
        plot = direction = rnd = None
        if m:
            plot = _clean_plot_name(m.group("plot"))
            direction = m.group("dir").lower()
            rnd = m.group("round").lower().strip("._")
        rows.append(
            {
                "plot_name": plot,
                "direction": direction,
                "round": rnd,
                "filename": f.name,
            }
        )
    return pd.DataFrame(rows)


# ------------------------------------------------------------------------ master
def load_master() -> pd.DataFrame:
    coords = pd.DataFrame()
    cfile = SUPPORT_DIR / "coordinates.xlsx"
    if cfile.exists():
        try:
            c = _norm_cols(pd.read_excel(cfile))
            c["plot_name"] = c["plot_name"].astype(str).str.strip().str.lower()
            # coordinates.xlsx has lat/long headers swapped.
            c["latitude"] = _to_num(c.get("long"))
            c["longitude"] = _to_num(c.get("lat"))
            coords = c[["plot_name", "latitude", "longitude"]].copy()
        except Exception as exc:  # noqa: BLE001
            print(f"  ! skip coordinates: {exc}")

    spec = pd.DataFrame()
    sfile = SUPPORT_DIR / "coordinates_and_species.xlsx"
    if sfile.exists():
        try:
            raw = pd.read_excel(sfile)
            raw = raw.iloc[:, :9]
            raw.columns = [
                "ecoregion",
                "site_name",
                "plot_name",
                "latitude",
                "longitude",
                "herb1",
                "herb2",
                "woody1",
                "woody2",
            ]
            raw["ecoregion"] = raw["ecoregion"].ffill()
            raw["site_name"] = raw["site_name"].ffill()
            raw["plot_clean"] = raw["plot_name"].apply(_clean_plot_name)
            raw = raw[raw["plot_clean"].notna()].copy()
            raw["plot_name"] = raw["plot_clean"]

            def _join(*vals):
                parts = [
                    str(v).strip().replace("_", " ")
                    for v in vals
                    if pd.notna(v) and str(v).strip() not in {"", "N/A", "NotApp"}
                ]
                return ", ".join(dict.fromkeys(parts)) or None

            raw["dominant_herbaceous"] = raw.apply(lambda r: _join(r["herb1"], r["herb2"]), axis=1)
            raw["dominant_woody"] = raw.apply(lambda r: _join(r["woody1"], r["woody2"]), axis=1)
            spec = raw[
                [
                    "plot_name",
                    "ecoregion",
                    "site_name",
                    "latitude",
                    "longitude",
                    "dominant_herbaceous",
                    "dominant_woody",
                ]
            ].copy()
        except Exception as exc:  # noqa: BLE001
            print(f"  ! skip coordinates_and_species: {exc}")

    if spec.empty:
        return coords
    if coords.empty:
        return spec
    merged = spec.merge(coords, on="plot_name", how="outer", suffixes=("_spec", "_coord"))
    merged["latitude"] = merged["latitude_coord"].combine_first(merged["latitude_spec"])
    merged["longitude"] = merged["longitude_coord"].combine_first(merged["longitude_spec"])
    return merged[
        [
            "plot_name",
            "ecoregion",
            "site_name",
            "latitude",
            "longitude",
            "dominant_herbaceous",
            "dominant_woody",
        ]
    ]


def _fix_coords(row):
    lat, lon = row.get("latitude"), row.get("longitude")
    if lat is not None and lon is not None and pd.notna(lat) and pd.notna(lon):
        if lat > 0 and lon > 0 and lat < lon:
            lat, lon = lon, lat
        if lat > 0 and 16 <= lat <= 30:
            lat = -lat
        row["latitude"], row["longitude"] = lat, lon
    return row


def _fill_site_ecoregion(plots: pd.DataFrame) -> pd.DataFrame:
    """Copy ecoregion/site_name from sibling plots that share the site prefix."""
    if "ecoregion" not in plots.columns:
        plots["ecoregion"] = None
    if "site_name" not in plots.columns:
        plots["site_name"] = None
    plots["site_prefix"] = plots["plot_name"].map(_site_prefix)
    eco_map = (
        plots.dropna(subset=["ecoregion"])
        .groupby("site_prefix")["ecoregion"]
        .agg(lambda s: s.mode().iloc[0] if len(s.mode()) else s.iloc[0])
    )
    site_map = (
        plots.dropna(subset=["site_name"])
        .groupby("site_prefix")["site_name"]
        .agg(lambda s: s.mode().iloc[0] if len(s.mode()) else s.iloc[0])
    )
    plots["ecoregion"] = plots["ecoregion"].fillna(plots["site_prefix"].map(eco_map))
    plots["site_name"] = plots["site_name"].fillna(plots["site_prefix"].map(site_map))
    plots = plots.drop(columns=["site_prefix"])
    return plots


def _merge_species_into_dominant(plots: pd.DataFrame, species: pd.DataFrame) -> pd.DataFrame:
    if species.empty:
        return plots
    herb = (
        species[species["plant_type"].str.contains("herb", case=False, na=False)]
        .groupby("plot_name")["species_name"]
        .apply(lambda s: ", ".join(dict.fromkeys(s)))
        .rename("species_herb")
    )
    woody = (
        species[species["plant_type"].str.contains("woody", case=False, na=False)]
        .groupby("plot_name")["species_name"]
        .apply(lambda s: ", ".join(dict.fromkeys(s)))
        .rename("species_woody")
    )
    plots = plots.merge(herb, on="plot_name", how="left").merge(woody, on="plot_name", how="left")
    if "dominant_herbaceous" not in plots.columns:
        plots["dominant_herbaceous"] = None
    if "dominant_woody" not in plots.columns:
        plots["dominant_woody"] = None
    plots["dominant_herbaceous"] = plots["dominant_herbaceous"].combine_first(plots["species_herb"])
    plots["dominant_woody"] = plots["dominant_woody"].combine_first(plots["species_woody"])
    return plots.drop(columns=[c for c in ("species_herb", "species_woody") if c in plots.columns])


def build() -> dict:
    if not DATASET_DIR.exists():
        raise FileNotFoundError(
            f"Dataset folder not found at {DATASET_DIR}. "
            f"For cloud/setup without Excel, run: python -m app.etl.load_reference"
        )

    print("Mining dataset into Postgres:", DATASET_DIR)
    master = load_master()
    cover_overall, cover_rounds = load_cover()
    standing = load_standing()
    biomass = load_biomass()
    quant = load_quant()
    grazing = load_grazing()
    species = load_species()
    photos = load_photo_catalog()

    frames = [master, cover_overall, standing, biomass, quant, grazing]
    plots: pd.DataFrame | None = None
    for fr in frames:
        if fr is None or fr.empty:
            continue
        fr = fr.loc[:, ~fr.columns.duplicated()]
        # Prefer grazing coords when master is missing — merge carefully.
        if plots is None:
            plots = fr
        else:
            overlap = [c for c in fr.columns if c != "plot_name" and c in plots.columns]
            if overlap:
                fr = fr.rename(columns={c: f"{c}_new" for c in overlap})
            plots = plots.merge(fr, on="plot_name", how="outer")
            for c in overlap:
                left, right = c, f"{c}_new"
                if right in plots.columns:
                    plots[c] = plots[c].combine_first(plots[right])
                    plots = plots.drop(columns=[right])

    if plots is None or plots.empty:
        raise RuntimeError("No plot data could be assembled from the dataset.")

    if "latitude" in plots.columns and "longitude" in plots.columns:
        plots = plots.apply(_fix_coords, axis=1)

    plots = _fill_site_ecoregion(plots)
    plots = _merge_species_into_dominant(plots, species)

    if not photos.empty and "plot_name" in photos.columns:
        counts = photos.dropna(subset=["plot_name"]).groupby("plot_name").size().rename("photo_count")
        plots = plots.merge(counts, on="plot_name", how="left")

    plots = plots.where(pd.notna(plots), None)

    session = SessionLocal()
    try:
        session.query(ReferencePhotoMeta).delete()
        session.query(ReferenceSpecies).delete()
        session.query(ReferenceCoverRound).delete()
        session.query(ReferencePlot).delete()
        session.commit()

        allowed = {c.name for c in ReferencePlot.__table__.columns}
        n_plots = 0
        for _, row in plots.iterrows():
            data = {
                k: (None if (isinstance(v, float) and pd.isna(v)) else v)
                for k, v in row.to_dict().items()
                if k in allowed
            }
            if not data.get("plot_name"):
                continue
            if data.get("photo_count") is not None:
                data["photo_count"] = int(data["photo_count"])
            session.add(ReferencePlot(**data))
            n_plots += 1

        n_rounds = 0
        if not cover_rounds.empty:
            allowed_r = {c.name for c in ReferenceCoverRound.__table__.columns}
            for _, row in cover_rounds.iterrows():
                data = {k: v for k, v in row.to_dict().items() if k in allowed_r}
                data = {k: (None if (isinstance(v, float) and pd.isna(v)) else v) for k, v in data.items()}
                if not data.get("plot_name") or not data.get("round"):
                    continue
                session.add(ReferenceCoverRound(**data))
                n_rounds += 1

        n_species = 0
        if not species.empty:
            for _, row in species.iterrows():
                session.add(
                    ReferenceSpecies(
                        plot_name=row["plot_name"],
                        plant_type=row["plant_type"],
                        species_name=row["species_name"],
                    )
                )
                n_species += 1

        n_photos = 0
        if not photos.empty:
            for _, row in photos.iterrows():
                session.add(
                    ReferencePhotoMeta(
                        plot_name=row.get("plot_name"),
                        direction=row.get("direction"),
                        round=row.get("round"),
                        filename=row["filename"],
                    )
                )
                n_photos += 1

        session.commit()
    finally:
        session.close()

    exported = export_reference_seed()
    result = {
        "plots": n_plots,
        "cover_rounds": n_rounds,
        "species": n_species,
        "photo_meta": n_photos,
        "seed": str(exported),
        "next": "python -m app.etl.load_reference_media  # stores JPEG/PDF/map bytes in Postgres",
    }
    print("ETL complete:", result)
    print("Cloud/runtime no longer needs Excel. Load media bytes before deleting dataset/pictures.")
    return result


if __name__ == "__main__":
    import sys

    from app.database import Base
    import app.models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    if "--export-only" in sys.argv:
        path = export_reference_seed()
        print("Exported seed to", path)
    else:
        build()
