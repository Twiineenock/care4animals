from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import settings

# 1. Configure Connection Arguments
connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# 2. Create the engine with a persistent connection pool
#    pool_size=5      — keep 5 connections alive permanently
#    max_overflow=10  — allow 10 extra under burst load
#    pool_timeout=10  — wait up to 10s for a free connection
#    pool_recycle=600 — recycle every 10 min to avoid Supabase idle timeouts
#    pool_pre_ping    — test connection health before using it
engine = create_engine(
    settings.database_url,
    pool_size=5,
    max_overflow=10,
    pool_timeout=10,
    pool_recycle=600,
    pool_pre_ping=True,
    future=True,
    connect_args=connect_args
)

# 3. Create the Session factory
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


# 4. Modern SQLAlchemy 2.0 Base class
class Base(DeclarativeBase):
    pass


# 5. Dependency to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def warm_up_pool():
    """
    Force the pool to open its first connection at startup so the
    first real request doesn't pay the cold-start penalty.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("INFO: Connection pool warmed up successfully.")
    except Exception as e:
        print(f"WARNING: Pool warm-up failed (non-fatal): {e}")
