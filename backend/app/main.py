from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import engine, Base
from app.routers import auth, customers, vehicles, job_cards, inventory, employees, attendance, dashboard, settings as settings_router, invoices, purchases, admin, estimates, reports
# Register new models so Alembic can find them
import app.models.garage  # noqa: F401
import app.models.super_admin  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: tables are created via Alembic, not here
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
API_V1 = "/api/v1"
app.include_router(auth.router, prefix=API_V1)
app.include_router(customers.router, prefix=API_V1)
app.include_router(vehicles.router, prefix=API_V1)
app.include_router(job_cards.router, prefix=API_V1)
app.include_router(inventory.router, prefix=API_V1)
app.include_router(employees.router, prefix=API_V1)
app.include_router(attendance.router, prefix=API_V1)
app.include_router(dashboard.router, prefix=API_V1)
app.include_router(settings_router.router, prefix=API_V1)
app.include_router(invoices.router, prefix=API_V1)
app.include_router(purchases.router, prefix=API_V1)
app.include_router(admin.router, prefix=API_V1)
app.include_router(estimates.router, prefix=API_V1)
app.include_router(reports.router, prefix=API_V1)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": settings.VERSION, "app": settings.APP_NAME}
