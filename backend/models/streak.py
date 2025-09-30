from __future__ import annotations
import uuid
from datetime import date, datetime
from sqlalchemy import Date, DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base

class DailyStreak(Base):
    """
    Tracks consecutive active days per user.
    Update this whenever the user answers at least one question on a day.
    """
    __tablename__ = "daily_streaks"

    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    current_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    last_active_date: Mapped[date | None] = mapped_column(Date)  # last day they were active (UTC or your chosen tz)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(),
                                                 onupdate=func.now(), nullable=False)

    user: Mapped["User"] = relationship(back_populates="streak")
