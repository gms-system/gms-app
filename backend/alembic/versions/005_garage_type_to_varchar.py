"""Convert garages.garage_type from ENUM to VARCHAR

Revision ID: 005
Revises: 004
Create Date: 2026-10-31

Why:
  Migration 004 created `garage_type` as a Postgres ENUM, but the SQLAlchemy
  model maps it as String(20). On INSERT, SQLAlchemy binds the value as VARCHAR
  which Postgres refuses to coerce into the enum column, so EVERY garage
  creation failed with:
      column "garage_type" is of type garage_type but expression is of
      type character varying
  Converting the column to VARCHAR (matching the model, same as `plan`) fixes
  garage creation for all garage types.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    # Convert the enum column to plain varchar, preserving existing values.
    conn.execute(sa.text("""
        ALTER TABLE garages
        ALTER COLUMN garage_type TYPE VARCHAR(20)
        USING garage_type::text
    """))
    conn.execute(sa.text("ALTER TABLE garages ALTER COLUMN garage_type SET DEFAULT '4_wheeler'"))
    # Drop the now-unused enum type (safe: no columns reference it anymore).
    conn.execute(sa.text("DROP TYPE IF EXISTS garage_type"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE garage_type AS ENUM ('4_wheeler', '2_wheeler', 'both');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """))
    conn.execute(sa.text("""
        ALTER TABLE garages
        ALTER COLUMN garage_type DROP DEFAULT
    """))
    conn.execute(sa.text("""
        ALTER TABLE garages
        ALTER COLUMN garage_type TYPE garage_type
        USING garage_type::garage_type
    """))
    conn.execute(sa.text("ALTER TABLE garages ALTER COLUMN garage_type SET DEFAULT '4_wheeler'"))
