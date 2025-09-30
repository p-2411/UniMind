from __future__ import annotations

import os
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is required (expected a PostgreSQL DSN)."
    )

if not DATABASE_URL.startswith("postgresql"):
    raise RuntimeError(
        "DATABASE_URL must be a PostgreSQL connection string, e.g. 'postgresql+psycopg2://user:pass@localhost:5432/unimind'."
    )

ECHO_SQL = os.getenv("SQL_ECHO", "0") == "1"

engine = create_engine(
    DATABASE_URL,
    echo=ECHO_SQL,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    future=True,
)

from backend import models  # noqa: E402  ensure metadata is populated

Base = models.Base


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
