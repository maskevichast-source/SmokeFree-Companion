from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    bot_token: SecretStr = Field(default=SecretStr(""), alias="BOT_TOKEN")
    gemini_api_key: SecretStr = Field(default=SecretStr(""), alias="GEMINI_API_KEY")
    database_url: str = Field(
        default="sqlite+aiosqlite:///./data/smokefree.db", alias="DATABASE_URL"
    )
    webapp_url: str = Field(default="", alias="WEBAPP_URL")
    port: int = Field(default=8000, alias="PORT")
    timezone: str = Field(default="Asia/Almaty", alias="TIMEZONE")
    default_city: str = Field(default="Астана", alias="DEFAULT_CITY")
    debug: bool = Field(default=False, alias="DEBUG")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def database_dsn(self) -> str:
        dsn = self.database_url.strip()
        if dsn.startswith("postgres://"):
            return "postgresql+asyncpg://" + dsn.removeprefix("postgres://")
        if dsn.startswith("postgresql://"):
            return "postgresql+asyncpg://" + dsn.removeprefix("postgresql://")
        if dsn.startswith("sqlite:///"):
            return "sqlite+aiosqlite://" + dsn.removeprefix("sqlite://")
        return dsn

    def validate_runtime(self) -> None:
        if not self.bot_token.get_secret_value():
            raise RuntimeError("BOT_TOKEN is required to start the Telegram bot")
        if not self.gemini_api_key.get_secret_value():
            raise RuntimeError("GEMINI_API_KEY is required to start the AI coach")


@lru_cache
def get_settings() -> Settings:
    return Settings()
