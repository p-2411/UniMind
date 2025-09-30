from sqlalchemy import text, inspect
from sqlalchemy.engine import Engine


def run_startup_migrations(engine: Engine) -> None:
    """
    One-time lightweight migration runner.
    Currently: drops the 'degree' column from 'users' if present.
    Supports Postgres; attempts SQLite drop (best-effort) and logs guidance.
    """
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        if "users" not in tables:
            return

        columns = {col["name"] for col in inspector.get_columns("users")}
        if "degree" not in columns:
            return

        dialect = engine.dialect.name
        drop_sql = "ALTER TABLE users DROP COLUMN degree"  # works on Postgres; SQLite >= 3.35

        with engine.begin() as conn:
            conn.execute(text(drop_sql))
            # If SQLite older than 3.35, this will raise; we catch below
        print("[migrations] Dropped column 'degree' from 'users' table")

    except Exception as exc:
        # Non-fatal: app can still run, but inserts may fail until user cleans up.
        print(
            "[migrations] Warning: could not drop 'degree' column automatically. "
            f"Reason: {exc}. If you use SQLite, consider recreating the DB; "
            "for Postgres run: ALTER TABLE users DROP COLUMN degree;"
        )

