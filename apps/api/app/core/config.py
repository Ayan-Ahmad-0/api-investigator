from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "API Investigator"
    APP_SECRET_KEY: str = "dev-insecure-secret-key-change-in-production-min32chars"
    DATABASE_URL: str = "sqlite:///./api_investigator.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    AI_PROVIDER: str = "mock"
    AI_API_KEY: str = ""
    AI_MODEL: str = "gemini-2.5-flash"

    INGESTION_KEY_HASH_SECRET: str = "dev-ingestion-hash-salt-investigator"
    ENCRYPTION_KEY: str = "dev-encryption-key-for-credentials-32b"

    EMAIL_PROVIDER: str = "mock"
    EMAIL_API_KEY: str = ""

    LOG_LEVEL: str = "INFO"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
