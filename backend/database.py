from __future__ import annotations
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./unimind.db")
ECHO_SQL = os.getenv("SQL_ECHO", "0") == "1"

is_sqlite = DATABASE_URL.startswith("sqlite")

# Engine
engine = create_engine(
    DATABASE_URL,
    echo=ECHO_SQL,
    # SQLite needs this; Postgres doesn’t.
    connect_args={"check_same_thread": False} if is_sqlite else {},
    # SQLite + threads/pydantic validation => avoid stale connections.
    poolclass=NullPool if is_sqlite else None,
    pool_pre_ping=not is_sqlite,  # keep Postgres connections fresh
    future=True,
)

# Session
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    future=True,
)

# Declarative base (import this Base in all your models)
Base = declarative_base()

# FastAPI dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()