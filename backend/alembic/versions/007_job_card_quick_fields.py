"""Job card quick/voice fields

Revision ID: 007
Revises: 006
Create Date: 2026-11-10

- work_type        : "service" | "repair" (quick / voice job cards)
- work_items       : default work list for that work type (JSON array of strings)
- source           : "manual" | "voice" — how the job card was created
- voice_transcript : raw speech per step + language, kept to improve the
                     voice model / suggestions later
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("job_cards", sa.Column("work_type", sa.String(20), nullable=True))
    op.add_column("job_cards", sa.Column("work_items", JSONB, nullable=True))
    op.add_column("job_cards", sa.Column("source", sa.String(20), nullable=False, server_default="manual"))
    op.add_column("job_cards", sa.Column("voice_transcript", JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column("job_cards", "voice_transcript")
    op.drop_column("job_cards", "source")
    op.drop_column("job_cards", "work_items")
    op.drop_column("job_cards", "work_type")
