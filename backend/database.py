import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Load .env relative to this file, not the working directory
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

# ── Connection URL ─────────────────────────────────────────────────────────
DB_URL = URL.create(
    drivername="mysql+aiomysql",
    username=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "3306")),
    database=os.getenv("DB_NAME", "echo_db"),
    query={"charset": "utf8mb4"},
)

# ── Engine ─────────────────────────────────────────────────────────────────
engine = create_async_engine(
    DB_URL,
    echo=False,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
)

# ── Session factory ────────────────────────────────────────────────────────
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# ── Base class for ORM models ──────────────────────────────────────────────
class Base(DeclarativeBase):
    pass

# ── Dependency: yields a session, closes it after the request ─────────────
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
