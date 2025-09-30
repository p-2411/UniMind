from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base

class TopicProgress(Base):
    __tablename__ = "topic_progress"

    user_id:  Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    topic_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True)

    rating: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False, default=0.200)  # 0.000–1.000
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user:  Mapped["User"]  = relationship(back_populates="progress")
    topic: Mapped["Topic"] = relationship(back_populates="progress_rows")
