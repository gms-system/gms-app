"""Cloud catalog (vehicle makes/models, spare parts, lubes)

Revision ID: 006
Revises: 005
Create Date: 2026-11-07

- catalog_items: global reference data managed by the super admin and synced
  to every app daily. Seeded from app/data/catalog_seed.json (exported from the
  frontend's bundled catalog by scripts/export-catalog-seed.js).
"""
import json
import os
import uuid
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED = os.path.join(os.path.dirname(__file__), "..", "..", "app", "data", "catalog_seed.json")


def upgrade() -> None:
    table = op.create_table(
        "catalog_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("data", JSONB, nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_catalog_items_kind", "catalog_items", ["kind"])

    with open(SEED, encoding="utf-8") as f:
        seed = json.load(f)
    rows = []
    for key, kind in (("cars", "car"), ("two_wheelers", "two_wheeler"), ("spare_parts", "spare_part"), ("lubes", "lubricant")):
        for i, entry in enumerate(seed.get(key, [])):
            rows.append({"id": uuid.uuid4(), "kind": kind, "data": entry, "sort_order": i, "is_active": True})
    if rows:
        op.bulk_insert(table, rows)


def downgrade() -> None:
    op.drop_index("ix_catalog_items_kind", table_name="catalog_items")
    op.drop_table("catalog_items")
