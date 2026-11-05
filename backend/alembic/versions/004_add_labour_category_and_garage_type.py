"""Add labour to item_category enum and garage_type to garages

Revision ID: 004
Revises: 003
Create Date: 2026-10-25

Changes:
  1. Add 'labour' value to item_category enum
  2. Add garage_type column to garages ('4_wheeler' | '2_wheeler' | 'both')
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Add 'labour' to item_category enum
    conn.execute(sa.text("ALTER TYPE item_category ADD VALUE IF NOT EXISTS 'labour'"))

    # 2. Add garage_type column to garages table
    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE garage_type AS ENUM ('4_wheeler', '2_wheeler', 'both');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """))
    conn.execute(sa.text("""
        ALTER TABLE garages
        ADD COLUMN IF NOT EXISTS garage_type garage_type NOT NULL DEFAULT '4_wheeler'
    """))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE garages DROP COLUMN IF EXISTS garage_type"))
    # Note: PostgreSQL does not support removing enum values — leave item_category as-is on downgrade
