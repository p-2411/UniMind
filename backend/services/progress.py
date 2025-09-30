from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from backend.models.progress import ProgressStage, TopicProgress


def stage_from_percent(percent: int) -> ProgressStage:
    if percent >= 100:
        return ProgressStage.mastered
    if percent > 0:
        return ProgressStage.in_progress
    return ProgressStage.unseen


def ensure_topic_progress(db: Session, user_id, topic_id) -> TopicProgress:
    progress = (
        db.query(TopicProgress)
        .filter(
            TopicProgress.user_id == user_id,
            TopicProgress.topic_id == topic_id,
        )
        .first()
    )
    if progress is None:
        progress = TopicProgress(user_id=user_id, topic_id=topic_id)
        db.add(progress)
        db.flush()  # assign defaults without committing
    return progress


def apply_attempt(progress: TopicProgress, correct: bool, seconds: int | None) -> TopicProgress:
    delta = 20 if correct else -10
    new_percent = min(100, max(0, progress.percent_complete + delta))
    progress.percent_complete = new_percent
    progress.stage = stage_from_percent(new_percent)

    now = datetime.utcnow()
    progress.last_seen_at = now
    progress.last_practised_at = now
    return progress
