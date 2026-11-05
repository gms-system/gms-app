from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://gms_user:gms_pass_2026@localhost:5432/gms_db"
    SECRET_KEY: str = "super-secret-gms-jwt-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_DIR: str = "./uploads"
    CORS_ORIGINS: str = '["http://localhost", "http://localhost:3000"]'
    APP_NAME: str = "GMS - Garage Management System"
    VERSION: str = "1.0.0"

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)

    class Config:
        env_file = ".env"


settings = Settings()
