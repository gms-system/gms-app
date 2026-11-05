"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2026-10-12

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ---------------------------------------------------------------------------
# Enum type helpers — created once via raw SQL, then referenced with
# create_type=False so SQLAlchemy never tries to CREATE TYPE again.
# ---------------------------------------------------------------------------
employee_role      = postgresql.ENUM("owner","manager","service_advisor","technician","receptionist","store_manager", name="employee_role",      create_type=False)
fuel_type          = postgresql.ENUM("petrol","diesel","cng","electric","hybrid","lpg",                              name="fuel_type",          create_type=False)
transmission_type  = postgresql.ENUM("manual","automatic","amt","dct","cvt","imt",                                  name="transmission_type",  create_type=False)
job_card_status    = postgresql.ENUM("received","work_in_progress","quality_check","ready_for_delivery","delivered","cancelled", name="job_card_status", create_type=False)
estimate_status    = postgresql.ENUM("draft","sent","pending_approval","approved","rejected","converted",            name="estimate_status",    create_type=False)
approval_status    = postgresql.ENUM("pending","approved","rejected",                                                name="approval_status",    create_type=False)
payment_mode       = postgresql.ENUM("cash","upi","card","bank_transfer","credit",                                   name="payment_mode",       create_type=False)
invoice_type       = postgresql.ENUM("tax_invoice","non_gst_invoice","proforma",                                     name="invoice_type",       create_type=False)
item_category      = postgresql.ENUM("spare_part","lubricant","paint","consumable","external","tool",                name="item_category",      create_type=False)
stock_movement_type= postgresql.ENUM("purchase","sale","adjustment","return","transfer",                             name="stock_movement_type",create_type=False)
attendance_status  = postgresql.ENUM("present","absent","half_day","leave",                                          name="attendance_status",  create_type=False)
leave_type         = postgresql.ENUM("casual","sick","privilege","unpaid",                                           name="leave_type",         create_type=False)
po_status          = postgresql.ENUM("draft","sent","partial","received","cancelled",                                name="po_status",          create_type=False)


def upgrade() -> None:
    conn = op.get_bind()

    # Enable UUID extension
    conn.execute(sa.text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))

    # Create all ENUM types (idempotent — skips if already exists)
    for ddl in [
        "DO $$ BEGIN CREATE TYPE employee_role       AS ENUM ('owner','manager','service_advisor','technician','receptionist','store_manager'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
        "DO $$ BEGIN CREATE TYPE fuel_type           AS ENUM ('petrol','diesel','cng','electric','hybrid','lpg'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
        "DO $$ BEGIN CREATE TYPE transmission_type   AS ENUM ('manual','automatic','amt','dct','cvt','imt'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
        "DO $$ BEGIN CREATE TYPE job_card_status     AS ENUM ('received','work_in_progress','quality_check','ready_for_delivery','delivered','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
        "DO $$ BEGIN CREATE TYPE estimate_status     AS ENUM ('draft','sent','pending_approval','approved','rejected','converted'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
        "DO $$ BEGIN CREATE TYPE approval_status     AS ENUM ('pending','approved','rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
        "DO $$ BEGIN CREATE TYPE payment_mode        AS ENUM ('cash','upi','card','bank_transfer','credit'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
        "DO $$ BEGIN CREATE TYPE invoice_type        AS ENUM ('tax_invoice','non_gst_invoice','proforma'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
        "DO $$ BEGIN CREATE TYPE item_category       AS ENUM ('spare_part','lubricant','paint','consumable','external','tool'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
        "DO $$ BEGIN CREATE TYPE stock_movement_type AS ENUM ('purchase','sale','adjustment','return','transfer'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
        "DO $$ BEGIN CREATE TYPE attendance_status   AS ENUM ('present','absent','half_day','leave'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
        "DO $$ BEGIN CREATE TYPE leave_type          AS ENUM ('casual','sick','privilege','unpaid'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
        "DO $$ BEGIN CREATE TYPE po_status           AS ENUM ('draft','sent','partial','received','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;",
    ]:
        conn.execute(sa.text(ddl))

    # ------------------------------------------------------------------
    # Tables — use postgresql.ENUM with create_type=False so SQLAlchemy
    # does NOT attempt to CREATE TYPE (we already did that above).
    # ------------------------------------------------------------------

    # garage_settings
    op.create_table(
        "garage_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("garage_name", sa.String(200), nullable=False),
        sa.Column("owner_name", sa.String(100)),
        sa.Column("address", sa.Text()),
        sa.Column("city", sa.String(100)),
        sa.Column("state", sa.String(100)),
        sa.Column("pincode", sa.String(10)),
        sa.Column("mobile", sa.String(15)),
        sa.Column("email", sa.String(100)),
        sa.Column("gstin", sa.String(20)),
        sa.Column("pan", sa.String(15)),
        sa.Column("logo_url", sa.Text()),
        sa.Column("invoice_prefix", sa.String(10), server_default="INV"),
        sa.Column("invoice_counter", sa.Integer(), server_default="1"),
        sa.Column("job_card_prefix", sa.String(10), server_default="JC"),
        sa.Column("job_card_counter", sa.Integer(), server_default="1"),
        sa.Column("default_gst_rate", sa.Numeric(5, 2), server_default="18.00"),
        sa.Column("currency", sa.String(5), server_default="INR"),
        sa.Column("timezone", sa.String(50), server_default="Asia/Kolkata"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # employees
    op.create_table(
        "employees",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("employee_code", sa.String(20), unique=True, nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100)),
        sa.Column("mobile", sa.String(15), unique=True, nullable=False),
        sa.Column("email", sa.String(100), unique=True),
        sa.Column("role", employee_role, nullable=False),
        sa.Column("password_hash", sa.Text()),
        sa.Column("date_of_joining", sa.Date()),
        sa.Column("date_of_birth", sa.Date()),
        sa.Column("address", sa.Text()),
        sa.Column("city", sa.String(100)),
        sa.Column("aadhaar_number", sa.String(20)),
        sa.Column("pan_number", sa.String(15)),
        sa.Column("salary", sa.Numeric(12, 2)),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("last_login", sa.DateTime(timezone=True)),
        sa.Column("avatar_url", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), server_default="false"),
    )

    # customers
    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("customer_code", sa.String(20), unique=True, nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("mobile", sa.String(15), nullable=False),
        sa.Column("alternate_mobile", sa.String(15)),
        sa.Column("email", sa.String(100)),
        sa.Column("address", sa.Text()),
        sa.Column("city", sa.String(100)),
        sa.Column("gstin", sa.String(20)),
        sa.Column("pan_number", sa.String(15)),
        sa.Column("notes", sa.Text()),
        sa.Column("outstanding_balance", sa.Numeric(12, 2), server_default="0"),
        sa.Column("lifetime_spending", sa.Numeric(12, 2), server_default="0"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), server_default="false"),
    )

    # suppliers
    op.create_table(
        "suppliers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("supplier_code", sa.String(20), unique=True, nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("contact_person", sa.String(100)),
        sa.Column("mobile", sa.String(15)),
        sa.Column("email", sa.String(100)),
        sa.Column("address", sa.Text()),
        sa.Column("city", sa.String(100)),
        sa.Column("gstin", sa.String(20)),
        sa.Column("pan_number", sa.String(15)),
        sa.Column("payment_terms_days", sa.Integer(), server_default="30"),
        sa.Column("outstanding_payable", sa.Numeric(12, 2), server_default="0"),
        sa.Column("notes", sa.Text()),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), server_default="false"),
    )

    # inventory_items
    op.create_table(
        "inventory_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("sku", sa.String(50), unique=True, nullable=False),
        sa.Column("part_number", sa.String(100)),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", item_category, nullable=False),
        sa.Column("brand", sa.String(100)),
        sa.Column("unit_of_measure", sa.String(20), server_default="pcs"),
        sa.Column("current_stock", sa.Numeric(12, 3), server_default="0"),
        sa.Column("min_stock_level", sa.Numeric(12, 3), server_default="0"),
        sa.Column("purchase_price", sa.Numeric(12, 2), server_default="0"),
        sa.Column("selling_price", sa.Numeric(12, 2), server_default="0"),
        sa.Column("hsn_code", sa.String(20)),
        sa.Column("gst_rate", sa.Numeric(5, 2), server_default="18"),
        sa.Column("rack_location", sa.String(50)),
        sa.Column("preferred_supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id")),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), server_default="false"),
    )

    # vehicles
    op.create_table(
        "vehicles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("registration_number", sa.String(20), nullable=False),
        sa.Column("chassis_number", sa.String(50)),
        sa.Column("engine_number", sa.String(50)),
        sa.Column("make", sa.String(100), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("variant", sa.String(100)),
        sa.Column("manufacturing_year", sa.Integer()),
        sa.Column("fuel_type", fuel_type),
        sa.Column("transmission", transmission_type),
        sa.Column("color", sa.String(50)),
        sa.Column("current_odometer", sa.Integer()),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), server_default="false"),
    )
    op.create_unique_constraint("uq_vehicle_reg_num", "vehicles", ["registration_number"])

    # job_cards
    op.create_table(
        "job_cards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("job_card_number", sa.String(30), unique=True, nullable=False),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("service_advisor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("status", job_card_status, server_default="received"),
        sa.Column("customer_complaint", sa.Text()),
        sa.Column("inspection_notes", sa.Text()),
        sa.Column("odometer_in", sa.Integer()),
        sa.Column("odometer_out", sa.Integer()),
        sa.Column("expected_delivery_date", sa.Date()),
        sa.Column("actual_delivery_date", sa.DateTime(timezone=True)),
        sa.Column("internal_notes", sa.Text()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_deleted", sa.Boolean(), server_default="false"),
    )

    # job_card_status_history
    op.create_table(
        "job_card_status_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("job_card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("job_cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("old_status", job_card_status),
        sa.Column("new_status", job_card_status, nullable=False),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("notes", sa.Text()),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # job_card_photos
    op.create_table(
        "job_card_photos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("job_card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("job_cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("photo_type", sa.String(20), server_default="before"),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("file_name", sa.String(255)),
        sa.Column("file_size", sa.Integer()),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # job_card_technicians
    op.create_table(
        "job_card_technicians",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("job_card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("job_cards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("technician_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_jc_technician", "job_card_technicians", ["job_card_id", "technician_id"])

    # estimates
    op.create_table(
        "estimates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("estimate_number", sa.String(30), unique=True, nullable=False),
        sa.Column("job_card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("job_cards.id"), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1"),
        sa.Column("status", estimate_status, server_default="draft"),
        sa.Column("approval_status", approval_status, server_default="pending"),
        sa.Column("subtotal", sa.Numeric(12, 2), server_default="0"),
        sa.Column("discount_type", sa.String(10), server_default="flat"),
        sa.Column("discount_value", sa.Numeric(12, 2), server_default="0"),
        sa.Column("discount_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column("taxable_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column("cgst_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column("sgst_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column("igst_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column("total_tax", sa.Numeric(12, 2), server_default="0"),
        sa.Column("grand_total", sa.Numeric(12, 2), server_default="0"),
        sa.Column("round_off", sa.Numeric(5, 2), server_default="0"),
        sa.Column("notes", sa.Text()),
        sa.Column("valid_until", sa.Date()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # estimate_items
    op.create_table(
        "estimate_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("estimate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("estimates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_type", sa.String(20), nullable=False),
        sa.Column("inventory_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inventory_items.id")),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 3), server_default="1"),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount_percent", sa.Numeric(5, 2), server_default="0"),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("hsn_code", sa.String(20)),
        sa.Column("gst_rate", sa.Numeric(5, 2), server_default="18"),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
    )

    # invoices
    op.create_table(
        "invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("invoice_number", sa.String(30), unique=True, nullable=False),
        sa.Column("invoice_date", sa.Date(), nullable=False),
        sa.Column("invoice_type", invoice_type, server_default="tax_invoice"),
        sa.Column("job_card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("job_cards.id")),
        sa.Column("estimate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("estimates.id")),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vehicles.id")),
        sa.Column("subtotal", sa.Numeric(12, 2), server_default="0"),
        sa.Column("discount_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column("taxable_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column("cgst_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column("sgst_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column("igst_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column("total_tax", sa.Numeric(12, 2), server_default="0"),
        sa.Column("grand_total", sa.Numeric(12, 2), server_default="0"),
        sa.Column("round_off", sa.Numeric(5, 2), server_default="0"),
        sa.Column("amount_paid", sa.Numeric(12, 2), server_default="0"),
        sa.Column("amount_due", sa.Numeric(12, 2), server_default="0"),
        sa.Column("notes", sa.Text()),
        sa.Column("is_cancelled", sa.Boolean(), server_default="false"),
        sa.Column("cancellation_reason", sa.Text()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # invoice_items
    op.create_table(
        "invoice_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_type", sa.String(20), nullable=False),
        sa.Column("inventory_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inventory_items.id")),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 3), server_default="1"),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("discount_percent", sa.Numeric(5, 2), server_default="0"),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("hsn_code", sa.String(20)),
        sa.Column("gst_rate", sa.Numeric(5, 2), server_default="18"),
        sa.Column("cgst_rate", sa.Numeric(5, 2), server_default="9"),
        sa.Column("sgst_rate", sa.Numeric(5, 2), server_default="9"),
        sa.Column("sort_order", sa.Numeric(), server_default="0"),
    )

    # payments
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("payment_mode", payment_mode, nullable=False),
        sa.Column("reference_number", sa.String(100)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # stock_movements
    op.create_table(
        "stock_movements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("inventory_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inventory_items.id"), nullable=False),
        sa.Column("movement_type", stock_movement_type, nullable=False),
        sa.Column("quantity", sa.Numeric(12, 3), nullable=False),
        sa.Column("quantity_before", sa.Numeric(12, 3), nullable=False),
        sa.Column("quantity_after", sa.Numeric(12, 3), nullable=False),
        sa.Column("unit_cost", sa.Numeric(12, 2)),
        sa.Column("reference_type", sa.String(50)),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True)),
        sa.Column("notes", sa.Text()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # purchase_orders
    op.create_table(
        "purchase_orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("po_number", sa.String(30), unique=True, nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("po_date", sa.Date(), nullable=False),
        sa.Column("expected_date", sa.Date()),
        sa.Column("status", po_status, server_default="draft"),
        sa.Column("subtotal", sa.Numeric(12, 2), server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column("grand_total", sa.Numeric(12, 2), server_default="0"),
        sa.Column("notes", sa.Text()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # purchase_order_items
    op.create_table(
        "purchase_order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("po_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("inventory_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inventory_items.id"), nullable=False),
        sa.Column("quantity_ordered", sa.Numeric(12, 3), nullable=False),
        sa.Column("quantity_received", sa.Numeric(12, 3), server_default="0"),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("gst_rate", sa.Numeric(5, 2), server_default="18"),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
    )

    # grn
    op.create_table(
        "grn",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("grn_number", sa.String(30), unique=True, nullable=False),
        sa.Column("po_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("purchase_orders.id")),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("grn_date", sa.Date(), nullable=False),
        sa.Column("supplier_invoice_no", sa.String(100)),
        sa.Column("supplier_invoice_date", sa.Date()),
        sa.Column("subtotal", sa.Numeric(12, 2), server_default="0"),
        sa.Column("tax_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column("grand_total", sa.Numeric(12, 2), server_default="0"),
        sa.Column("notes", sa.Text()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # grn_items
    op.create_table(
        "grn_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("grn_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("grn.id", ondelete="CASCADE"), nullable=False),
        sa.Column("inventory_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inventory_items.id"), nullable=False),
        sa.Column("quantity_received", sa.Numeric(12, 3), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("gst_rate", sa.Numeric(5, 2), server_default="18"),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("batch_number", sa.String(50)),
        sa.Column("expiry_date", sa.Date()),
    )

    # purchase_returns
    op.create_table(
        "purchase_returns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("return_number", sa.String(30), unique=True, nullable=False),
        sa.Column("grn_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("grn.id")),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("return_date", sa.Date(), nullable=False),
        sa.Column("reason", sa.Text()),
        sa.Column("total_amount", sa.Numeric(12, 2), server_default="0"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # purchase_return_items
    op.create_table(
        "purchase_return_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("purchase_return_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("purchase_returns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("inventory_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inventory_items.id"), nullable=False),
        sa.Column("quantity_returned", sa.Numeric(12, 3), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
    )

    # attendance
    op.create_table(
        "attendance",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("attendance_date", sa.Date(), nullable=False),
        sa.Column("status", attendance_status, nullable=False, server_default="present"),
        sa.Column("punch_in", sa.DateTime(timezone=True)),
        sa.Column("punch_out", sa.DateTime(timezone=True)),
        sa.Column("working_hours", sa.Numeric(5, 2)),
        sa.Column("leave_type", leave_type),
        sa.Column("notes", sa.Text()),
        sa.Column("marked_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_attendance_emp_date", "attendance", ["employee_id", "attendance_date"])

    # audit_logs
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("table_name", sa.String(100), nullable=False),
        sa.Column("record_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("old_values", postgresql.JSONB()),
        sa.Column("new_values", postgresql.JSONB()),
        sa.Column("performed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("employees.id")),
        sa.Column("performed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("ip_address", sa.String(50)),
    )

    # ------------------------------------------------------------------
    # Seed data
    # ------------------------------------------------------------------
    conn.execute(sa.text("""
        INSERT INTO garage_settings (garage_name, invoice_prefix, job_card_prefix)
        VALUES ('My Garage', 'INV', 'JC')
        ON CONFLICT DO NOTHING
    """))

    # Default owner account — password: Admin@123  (bcrypt hash, rounds=12)
    conn.execute(sa.text("""
        INSERT INTO employees (employee_code, first_name, last_name, mobile, role, password_hash, is_active)
        VALUES (
            'EMP-0001', 'Admin', 'Owner', '9999999999', 'owner',
            '$2b$12$CfJLzlEiKqVVBaOWJGvSYe.39s1ymsqk4N4YURlri5.c.BMFth/zm',
            true
        )
        ON CONFLICT (mobile) DO NOTHING
    """))


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("attendance")
    op.drop_table("purchase_return_items")
    op.drop_table("purchase_returns")
    op.drop_table("grn_items")
    op.drop_table("grn")
    op.drop_table("purchase_order_items")
    op.drop_table("purchase_orders")
    op.drop_table("stock_movements")
    op.drop_table("payments")
    op.drop_table("invoice_items")
    op.drop_table("invoices")
    op.drop_table("estimate_items")
    op.drop_table("estimates")
    op.drop_table("job_card_technicians")
    op.drop_table("job_card_photos")
    op.drop_table("job_card_status_history")
    op.drop_table("job_cards")
    op.drop_table("vehicles")
    op.drop_table("inventory_items")
    op.drop_table("suppliers")
    op.drop_table("customers")
    op.drop_table("employees")
    op.drop_table("garage_settings")
    for t in ["employee_role","fuel_type","transmission_type","job_card_status",
              "estimate_status","approval_status","payment_mode","invoice_type",
              "item_category","stock_movement_type","attendance_status","leave_type","po_status"]:
        op.execute(sa.text(f"DROP TYPE IF EXISTS {t}"))
