"""Multi-tenant: garages, super_admins, garage_id columns

Revision ID: 002
Revises: 001
Create Date: 2026-10-15

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ---------------------------------------------------------------
    # 1. garages table
    # ---------------------------------------------------------------
    op.create_table(
        "garages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("owner_name", sa.String(100)),
        sa.Column("mobile", sa.String(15), unique=True, nullable=False),
        sa.Column("email", sa.String(100)),
        sa.Column("address", sa.Text()),
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(100)),
        sa.Column("gstin", sa.String(20)),
        sa.Column("plan", sa.String(20), server_default="basic"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("subscription_start", sa.Date()),
        sa.Column("subscription_end", sa.Date()),
        sa.Column("max_users", sa.Integer(), server_default="5"),
        sa.Column("grace_period_days", sa.Integer(), server_default="7"),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ---------------------------------------------------------------
    # 2. super_admins table
    # ---------------------------------------------------------------
    op.create_table(
        "super_admins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(100), unique=True, nullable=False),
        sa.Column("mobile", sa.String(15), unique=True, nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("last_login", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ---------------------------------------------------------------
    # 3. Add garage_id column to all business tables
    # ---------------------------------------------------------------
    tables_needing_garage_id = [
        "employees",
        "customers",
        "vehicles",
        "job_cards",
        "job_card_status_history",
        "job_card_photos",
        "job_card_technicians",
        "estimates",
        "estimate_items",
        "invoices",
        "invoice_items",
        "payments",
        "inventory_items",
        "stock_movements",
        "suppliers",
        "purchase_orders",
        "purchase_order_items",
        "grn",
        "grn_items",
        "purchase_returns",
        "purchase_return_items",
        "attendance",
        "garage_settings",
        "audit_logs",
    ]

    for table in tables_needing_garage_id:
        op.add_column(
            table,
            sa.Column("garage_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("garages.id"), nullable=True)
        )
        op.create_index(f"ix_{table}_garage_id", table, ["garage_id"])

    # ---------------------------------------------------------------
    # 4. Seed: create default garage from existing garage_settings
    #    and link all existing rows to it
    # ---------------------------------------------------------------
    conn.execute(sa.text("""
        INSERT INTO garages (id, name, mobile, plan, is_active, max_users, subscription_start)
        SELECT
            uuid_generate_v4(),
            COALESCE(garage_name, 'My Garage'),
            '9999999999',
            'pro',
            true,
            10,
            CURRENT_DATE
        FROM garage_settings
        LIMIT 1
        ON CONFLICT (mobile) DO NOTHING
    """))

    # Assign all existing rows to the first garage (one statement per table)
    for table in ["employees", "customers", "vehicles", "job_cards", "estimates",
                  "invoices", "inventory_items", "suppliers", "purchase_orders",
                  "attendance", "garage_settings", "audit_logs"]:
        conn.execute(sa.text(
            f"UPDATE {table} SET garage_id = (SELECT id FROM garages LIMIT 1) WHERE garage_id IS NULL"
        ))

    # ---------------------------------------------------------------
    # 5. Seed default Super Admin  (password: SuperAdmin@123)
    # ---------------------------------------------------------------
    # Default Super Admin  (password: SuperAdmin@123)
    conn.execute(sa.text("""
        INSERT INTO super_admins (name, email, mobile, password_hash, is_active)
        VALUES (
            'Super Admin',
            'admin@gms.in',
            '8888888888',
            '$2b$12$Eq9rPXr9RMnhczoBhz8KqO.PLBqs98z5J0X1VKNPDtvs5IZoSXcC2',
            true
        )
        ON CONFLICT (email) DO NOTHING
    """))


def downgrade() -> None:
    conn = op.get_bind()

    # Remove indexes and garage_id columns
    tables_needing_garage_id = [
        "audit_logs", "attendance", "purchase_return_items", "purchase_returns",
        "grn_items", "grn", "purchase_order_items", "purchase_orders", "suppliers",
        "stock_movements", "inventory_items", "payments", "invoice_items", "invoices",
        "estimate_items", "estimates", "job_card_technicians", "job_card_photos",
        "job_card_status_history", "job_cards", "vehicles", "customers",
        "employees", "garage_settings",
    ]
    for table in tables_needing_garage_id:
        op.drop_index(f"ix_{table}_garage_id", table_name=table)
        op.drop_column(table, "garage_id")

    op.drop_table("super_admins")
    op.drop_table("garages")
