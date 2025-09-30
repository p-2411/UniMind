import logging
from typing import Tuple

from sqlalchemy import inspect
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def _sqlite_version(engine: Engine) -> Tuple[int, int, int]:
    with engine.connect() as conn:
        result = conn.exec_driver_sql("select sqlite_version()").scalar()
    parts = [int(p) for p in (result.split(".") + ["0", "0"])[:3]]
    return tuple(parts)  # type: ignore[return-value]


def run_startup_migrations(engine: Engine) -> None:
    """Run lightweight, idempotent migrations at application boot."""
    inspector = inspect(engine)

    if "users" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("users")}
    if "degree" not in columns:
        return

    dialect = engine.dialect.name

    try:
        if dialect == "sqlite":
            version = _sqlite_version(engine)
            if version < (3, 35, 0):
                logger.warning(
                    "[migrations] SQLite %s does not support DROP COLUMN. "
                    "Recreate the database or upgrade SQLite to >= 3.35 to remove 'degree'.",
                    ".".join(map(str, version)),
                )
                return
            drop_sql = "ALTER TABLE users DROP COLUMN degree"
        elif dialect in {"postgresql", "postgres"}:
            drop_sql = "ALTER TABLE users DROP COLUMN IF EXISTS degree"
        else:
            drop_sql = "ALTER TABLE users DROP COLUMN degree"

        with engine.begin() as conn:
            conn.exec_driver_sql(drop_sql)

        logger.info("[migrations] Dropped column 'degree' from 'users' table")

    except Exception as exc:  # pragma: no cover - defensive guard
        logger.warning(
            "[migrations] Could not drop column 'degree' automatically (%s). "
            "Apply the change manually if you rely on that table.",
            exc,
        )
