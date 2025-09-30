from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from . import Base

class Content(Base):
    __tablename__ = "content"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Always belongs to a Topic
    topic_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)

    # Optionally narrowed to a Subtopic (must be a child of topic_id; enforce app-side)
    subtopic_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True),
        ForeignKey("subtopics.id", ondelete="SET NULL"))

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    resource_url: Mapped[str | None] = mapped_column(String(1024))
    body: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    topic:    Mapped["Topic"]    = relationship(back_populates="contents")
    subtopic: Mapped["Subtopic"] = relationship(back_populates="contents")
