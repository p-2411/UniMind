from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from . import Base


class ProgressStage(str, enum.Enum):
    unseen = "unseen"
    in_progress = "in_progress"
    mastered = "mastered"


class TopicProgress(Base):
    __tablename__ = "topic_progress"
    __table_args__ = (
        CheckConstraint("percent_complete >= 0 AND percent_complete <= 100", name="ck_topic_progress_percent_range"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        primary_key=True,
    )

    stage: Mapped[ProgressStage] = mapped_column(
        Enum(ProgressStage, name="topic_progress_stage_enum"),
        nullable=False,
        default=ProgressStage.unseen,
    )
    percent_complete: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_practised_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="progress")
    topic: Mapped["Topic"] = relationship(back_populates="progress_rows")
