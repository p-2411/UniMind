from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base

class Topic(Base):
    __tablename__ = "topics"
    __table_args__ = (UniqueConstraint("course_code", "name", name="uq_topics_course_name"),)

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_code: Mapped[str] = mapped_column(String(32), ForeignKey("courses.code", ondelete="CASCADE"), nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    course:     Mapped["Course"]             = relationship(back_populates="topics")
    subtopics:  Mapped[list["Subtopic"]]     = relationship(back_populates="topic", cascade="all, delete-orphan")
    contents:   Mapped[list["Content"]]      = relationship(back_populates="topic", cascade="all, delete-orphan")
    questions:  Mapped[list["Question"]]     = relationship(back_populates="topic", cascade="all, delete-orphan")
    progress_rows: Mapped[list["TopicProgress"]] = relationship(back_populates="topic", cascade="all, delete-orphan")
