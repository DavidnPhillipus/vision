from sqlalchemy import Float, Integer, LargeBinary, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ReferencePlot(Base):
    """One row per research plot, aggregated from the Namibia rangeland dataset.

    Historical reference data from research sites — never a direct measurement of a
    farmer's camp. Runtime reads this table from Postgres only (no Excel folder).
    """

    __tablename__ = "reference_plots"

    id: Mapped[int] = mapped_column(primary_key=True)
    plot_name: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    site_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    ecoregion: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    area_ha: Mapped[float | None] = mapped_column(Float, nullable=True)

    perennial_grass_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    annual_grass_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    grass_cover_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    bare_ground_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    litter_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    woody_cover_pct: Mapped[float | None] = mapped_column(Float, nullable=True)

    standing_crop_estimate: Mapped[float | None] = mapped_column(Float, nullable=True)
    biomass_clipped: Mapped[float | None] = mapped_column(Float, nullable=True)

    woody_mean_height: Mapped[float | None] = mapped_column(Float, nullable=True)
    woody_seedlings: Mapped[float | None] = mapped_column(Float, nullable=True)

    cattle_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    goat_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sheep_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rotational_grazing: Mapped[str | None] = mapped_column(String(20), nullable=True)
    rainfall_note: Mapped[str | None] = mapped_column(String(400), nullable=True)
    rainfall_mm: Mapped[float | None] = mapped_column(Float, nullable=True)

    livestock_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    grazing_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    game_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    other_comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    dominant_herbaceous: Mapped[str | None] = mapped_column(String(300), nullable=True)
    dominant_woody: Mapped[str | None] = mapped_column(String(300), nullable=True)

    photo_count: Mapped[int | None] = mapped_column(Integer, nullable=True)


class ReferenceCoverRound(Base):
    """Per-collection-round vegetation cover for seasonal/annual trend comparison."""

    __tablename__ = "reference_cover_rounds"

    id: Mapped[int] = mapped_column(primary_key=True)
    plot_name: Mapped[str] = mapped_column(String(60), index=True)
    round: Mapped[str] = mapped_column(String(20), index=True)

    grass_cover_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    perennial_grass_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    annual_grass_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    bare_ground_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    litter_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    woody_cover_pct: Mapped[float | None] = mapped_column(Float, nullable=True)


class ReferenceSpecies(Base):
    """Dominant species listed per plot (from dominant_species.xlsx)."""

    __tablename__ = "reference_species"
    __table_args__ = (UniqueConstraint("plot_name", "plant_type", "species_name", name="uq_ref_species"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    plot_name: Mapped[str] = mapped_column(String(60), index=True)
    plant_type: Mapped[str] = mapped_column(String(40), nullable=False)
    species_name: Mapped[str] = mapped_column(String(200), nullable=False)


class ReferencePhotoMeta(Base):
    """Research plot photos stored in Postgres (bytes + catalog fields).

    Images are lightly compressed for storage; the raw ``dataset/pictures`` folder
    is not required after a successful media load.
    """

    __tablename__ = "reference_photo_meta"
    __table_args__ = (UniqueConstraint("filename", name="uq_ref_photo_filename"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    plot_name: Mapped[str | None] = mapped_column(String(60), nullable=True, index=True)
    direction: Mapped[str | None] = mapped_column(String(20), nullable=True)
    round: Mapped[str | None] = mapped_column(String(40), nullable=True)
    filename: Mapped[str] = mapped_column(String(260), nullable=False)

    content_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    byte_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    original_byte_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)


class ReferenceAsset(Base):
    """Non-plot dataset assets kept in Postgres (manual PDF, site maps)."""

    __tablename__ = "reference_assets"
    __table_args__ = (UniqueConstraint("filename", name="uq_ref_asset_filename"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(40), index=True)  # manual | map
    filename: Mapped[str] = mapped_column(String(260), nullable=False)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    content_type: Mapped[str] = mapped_column(String(80), nullable=False)
    byte_size: Mapped[int] = mapped_column(Integer, nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
