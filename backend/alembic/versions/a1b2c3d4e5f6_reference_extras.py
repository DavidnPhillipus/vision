"""Add mined reference extras: species, photo catalog, grazing comments.

Revision ID: a1b2c3d4e5f6
Revises: 9827c44cef3f
Create Date: 2026-07-30 16:40:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "9827c44cef3f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("reference_plots", sa.Column("rainfall_mm", sa.Float(), nullable=True))
    op.add_column("reference_plots", sa.Column("livestock_comments", sa.Text(), nullable=True))
    op.add_column("reference_plots", sa.Column("grazing_comments", sa.Text(), nullable=True))
    op.add_column("reference_plots", sa.Column("game_note", sa.Text(), nullable=True))
    op.add_column("reference_plots", sa.Column("other_comments", sa.Text(), nullable=True))
    op.add_column("reference_plots", sa.Column("photo_count", sa.Integer(), nullable=True))

    op.create_table(
        "reference_species",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("plot_name", sa.String(length=60), nullable=False),
        sa.Column("plant_type", sa.String(length=40), nullable=False),
        sa.Column("species_name", sa.String(length=200), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("plot_name", "plant_type", "species_name", name="uq_ref_species"),
    )
    op.create_index(op.f("ix_reference_species_plot_name"), "reference_species", ["plot_name"], unique=False)

    op.create_table(
        "reference_photo_meta",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("plot_name", sa.String(length=60), nullable=True),
        sa.Column("direction", sa.String(length=20), nullable=True),
        sa.Column("round", sa.String(length=40), nullable=True),
        sa.Column("filename", sa.String(length=260), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("filename", name="uq_ref_photo_filename"),
    )
    op.create_index(op.f("ix_reference_photo_meta_plot_name"), "reference_photo_meta", ["plot_name"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_reference_photo_meta_plot_name"), table_name="reference_photo_meta")
    op.drop_table("reference_photo_meta")
    op.drop_index(op.f("ix_reference_species_plot_name"), table_name="reference_species")
    op.drop_table("reference_species")
    op.drop_column("reference_plots", "photo_count")
    op.drop_column("reference_plots", "other_comments")
    op.drop_column("reference_plots", "game_note")
    op.drop_column("reference_plots", "grazing_comments")
    op.drop_column("reference_plots", "livestock_comments")
    op.drop_column("reference_plots", "rainfall_mm")
