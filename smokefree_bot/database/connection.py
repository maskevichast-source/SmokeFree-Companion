from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from bot.config import get_settings
from database.models import Base

settings = get_settings()

_dsn = settings.database_dsn

# Auto-create data directory if SQLite file path is used
if "sqlite" in _dsn:
    clean_path = _dsn.split(":///")[-1]
    if clean_path and not clean_path.startswith(":memory:"):
        db_dir = Path(clean_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)

engine_kwargs: dict = {
    "echo": settings.debug,
    "future": True,
}

if not _dsn.startswith("sqlite"):
    # Managed Postgres providers (Neon, Supabase, Railway's own Postgres, etc.)
    # commonly hand out URLs with libpq-style query params such as
    # `sslmode=require` or `channel_binding=require`. asyncpg's driver does not
    # understand those kwargs directly, so they're stripped here and translated
    # into the connect_args asyncpg actually expects. TLS is requested whenever
    # the original URL asked for it (or said nothing, which we treat as "yes"
    # since virtually every managed Postgres free tier requires TLS).
    parts = urlsplit(_dsn)
    query = dict(parse_qsl(parts.query))
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)
    _dsn = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))

    connect_args: dict = {}
    if sslmode not in ("disable",):
        connect_args["ssl"] = "require"

    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_recycle": 1800,
        # A single-user personal bot never needs a large pool, and free-tier
        # managed Postgres (e.g. Neon's free plan) caps concurrent connections
        # low — keep this modest so the app never gets rejected for exceeding
        # the provider's connection limit.
        "pool_size": 3,
        "max_overflow": 2,
        "connect_args": connect_args,
    })

engine = create_async_engine(_dsn, **engine_kwargs)

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
