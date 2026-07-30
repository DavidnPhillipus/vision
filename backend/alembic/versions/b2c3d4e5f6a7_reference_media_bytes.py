"""Store research photo bytes + manuals/maps in Postgres.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-30 17:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("reference_photo_meta", sa.Column("content_type", sa.String(length=80), nullable=True))
    op.add_column("reference_photo_meta", sa.Column("byte_size", sa.Integer(), nullable=True))
    op.add_column("reference_photo_meta", sa.Column("original_byte_size", sa.Integer(), nullable=True))
    op.add_column("reference_photo_meta", sa.Column("image_data", sa.LargeBinary(), nullable=True))

    op.create_table(
        "reference_assets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("filename", sa.String(length=260), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("content_type", sa.String(length=80), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("filename", name="uq_ref_asset_filename"),
    )
    op.create_index(op.f("ix_reference_assets_kind"), "reference_assets", ["kind"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_reference_assets_kind"), table_name="reference_assets")
    op.drop_table("reference_assets")
    op.drop_column("reference_photo_meta", "image_data")
    op.drop_column("reference_photo_meta", "original_byte_size")
    op.drop_column("reference_photo_meta", "byte_size")
    op.drop_column("reference_photo_meta", "content_type")
