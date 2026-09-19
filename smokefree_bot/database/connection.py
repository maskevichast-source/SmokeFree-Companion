from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from bot.config import get_settings
from database.models import Base

settings = get_settings()

# Auto-create data directory if SQLite file path is used
if "sqlite" in settings.database_dsn:
    clean_path = settings.database_dsn.split(":///")[-1]
    if clean_path and not clean_path.startswith(":memory:"):
        db_dir = Path(clean_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)

engine_kwargs: dict = {
    "echo": settings.debug,
    "future": True,
}
if not settings.database_dsn.startswith("sqlite"):
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_recycle": 1800,
        "pool_size": 10,
        "max_overflow": 20,
    })

engine = create_async_engine(settings.database_dsn, **engine_kwargs)

SessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def init_db() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        from sqlalchemy import text
        try:
            await connection.execute(text("ALTER TABLE users ADD COLUMN quit_at TIMESTAMP;"))
        except Exception:
            pass

async def close_db() -> None:
    await engine.dispose()
