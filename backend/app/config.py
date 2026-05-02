from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), extra="ignore")

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/vitodoo"
    secret_key: str = "dev-secret-change-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost:5173"
    redis_url: str | None = None
    upstash_redis_url: str | None = Field(default=None, alias="UPSTASH_REDIS_URL")
    slot_lock_ttl_seconds: int = 10
    phonepe_client_id: str | None = None
    phonepe_client_secret: str | None = None
    phonepe_client_version: int | None = None
    phonepe_env: str = "SANDBOX"
    phonepe_callback_username: str | None = None
    phonepe_callback_password: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_from_name: str = "Neubook"
    smtp_use_tls: bool = True
    frontend_base_url: str = "http://localhost:5173"

    @property
    def lock_redis_url(self) -> str | None:
        return self.upstash_redis_url or self.redis_url


settings = Settings()
