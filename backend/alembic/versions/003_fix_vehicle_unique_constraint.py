"""Fix vehicle registration unique constraint to be per-garage

Revision ID: 003
Revises: 002
Create Date: 2026-10-20

Problem:
  Migration 001 created a global unique constraint on vehicles.registration_number.
  This means two different garages cannot register the same plate (e.g. MH12AB1234).
  The constraint must be (registration_number, garage_id) — unique per garage only.
"""
from typing import Sequence, Union
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old global unique constraint
    op.drop_constraint("uq_vehicle_reg_num", "vehicles", type_="unique")

    # Create new constraint scoped to garage — same plate allowed in different garages
    op.create_unique_constraint(
        "uq_vehicle_reg_num_per_garage",
        "vehicles",
        ["registration_number", "garage_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_vehicle_reg_num_per_garage", "vehicles", type_="unique")
    op.create_unique_constraint("uq_vehicle_reg_num", "vehicles", ["registration_number"])
