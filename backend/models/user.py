from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    enrolments: Mapped[list["Enrolment"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    attempts:   Mapped[list["QuestionAttempt"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    progress:   Mapped[list["TopicProgress"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    streak:     Mapped["DailyStreak"] | None = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
