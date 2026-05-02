from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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

    @property
    def lock_redis_url(self) -> str | None:
        return self.upstash_redis_url or self.redis_url


settings = Settings()
