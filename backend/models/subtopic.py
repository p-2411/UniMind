from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .. import Base

class Subtopic(Base):
    __tablename__ = "subtopics"
    __table_args__ = (UniqueConstraint("topic_id", "name", name="uq_subtopics_topic_name"),)

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    topic:     Mapped["Topic"]     = relationship(back_populates="subtopics")
    contents:  Mapped[list["Content"]]  = relationship(back_populates="subtopic", cascade="all, delete-orphan")
    questions: Mapped[list["Question"]] = relationship(back_populates="subtopic", cascade="all, delete-orphan")
