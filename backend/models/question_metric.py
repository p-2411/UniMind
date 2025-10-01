from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from . import Base


class QuestionMetric(Base):
    """Per-user, per-question scheduling metrics.

    Keeps question-level rolling accuracy and spaced-repetition timestamps so
    the browser extension and in-app review stay in sync across sessions.
    """

    __tablename__ = "question_metrics"

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        primary_key=True,
    )

    rolling_accuracy: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

