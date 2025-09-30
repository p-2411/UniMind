from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from backend.models.streak import DailyStreak


def update_streak(db: Session, user_id, timestamp: datetime | None = None) -> DailyStreak:
    """Upsert the user's streak using the provided timestamp (UTC)."""
    now = timestamp or datetime.utcnow()
    today = now.date()

    streak = db.get(DailyStreak, user_id)
    if streak is None:
        streak = DailyStreak(
            user_id=user_id,
            current_streak=1,
            longest_streak=1,
            last_active_date=today,
        )
        db.add(streak)
        return streak

    if streak.last_active_date == today:
        return streak

    if streak.last_active_date == (today - timedelta(days=1)):
        streak.current_streak += 1
    else:
        streak.current_streak = 1

    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak

    streak.last_active_date = today
    return streak
