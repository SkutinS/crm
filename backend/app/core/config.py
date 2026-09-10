from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Anchored to backend/ regardless of the process's current working
# directory — a bare relative path here (or in env_file below) would
# resolve against whatever CWD the process happens to be started from,
# so e.g. launching uvicorn from a different directory would silently
# create/read a *different*, empty crm.db instead of the real one.
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_SQLITE_PATH = BACKEND_DIR / "crm.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    # SQLite by default for local dev; point DATABASE_URL at Postgres
    # (e.g. postgresql+psycopg://user:pass@host:5432/crm) to switch later —
    # no code changes needed, only this setting.
    database_url: str = f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"

    secret_key: str = "dev-secret-key-change-me-in-production"
    access_token_expire_minutes: int = 60 * 12  # 12 hours
    algorithm: str = "HS256"

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
