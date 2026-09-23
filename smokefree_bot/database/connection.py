import ssl
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
    # into the connect_args asyncpg actually expects.
    parts = urlsplit(_dsn)
    query = dict(parse_qsl(parts.query))
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)
    _dsn = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))

    connect_args: dict = {
        # Neon and PgBouncer connection poolers in transaction mode do not support
        # server-side prepared statements. Disabling statement caching prevents
        # "prepared statement does not exist" errors.
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }
    # asyncpg expects an ssl.SSLContext object or boolean, NOT a string like "require"
    # which causes AttributeError: 'str' object has no attribute 'wrap_bio'
    if sslmode not in ("disable", "false", "0"):
        ssl_ctx = ssl.create_default_context()
        connect_args["ssl"] = ssl_ctx

    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_recycle": 1800,
        "pool_size": 5,
        "max_overflow": 5,
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
        # Best-effort additive migrations for databases created by older
        # versions of the schema. In PostgreSQL, IF NOT EXISTS prevents transaction aborts.
        is_sqlite = engine.dialect.name == "sqlite"
        if not is_sqlite:
            for stmt in (
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS quit_at TIMESTAMPTZ;",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'Asia/Almaty';",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'KZT';",
                "ALTER TABLE relapse_incidents ADD COLUMN IF NOT EXISTS cigarettes INTEGER DEFAULT 1;",
                "ALTER TABLE relapse_incidents ADD COLUMN IF NOT EXISTS reflection TEXT DEFAULT '';",
                "ALTER TABLE relapse_incidents ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT '';",
            ):
                try:
                    await connection.execute(text(stmt))
                except Exception:
                    pass
        else:
            for stmt in (
                "ALTER TABLE users ADD COLUMN quit_at TIMESTAMP;",
                "ALTER TABLE relapse_incidents ADD COLUMN cigarettes INTEGER DEFAULT 1;",
                "ALTER TABLE relapse_incidents ADD COLUMN reflection TEXT DEFAULT '';",
                "ALTER TABLE relapse_incidents ADD COLUMN plan TEXT DEFAULT '';",
            ):
                try:
                    await connection.execute(text(stmt))
                except Exception:
                    pass

async def close_db() -> None:
    await engine.dispose()
