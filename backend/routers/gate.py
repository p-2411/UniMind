from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models, schemas
from backend.services.progress_engine import update_rating, stage_from_rating
from backend.services.streaks import update_streak

router = APIRouter(
    prefix="/gate",
    tags=["gate"],
)

# Tunables for the “study to unlock” flow
ONE_HOUR_MS = 60 * 60 * 1000
RECENT_ANSWER_CUTOFF_MIN = 10  # don't re-ask the same question within N minutes

@router.get("/question", response_model=schemas.GateQuestion)
def gate_question(
    user_id: str = Query(..., description="UUID of the student"),
    target: str | None = Query(None, description="Optional course code to limit selection"),
    db: Session = Depends(get_db),
):
    """
    Pick one question for the gate:
    - Prefer the user's weakest topic (lowest rating, unseen first).
    - Optionally constrain by course (target=COMP2521).
    - Avoid questions answered very recently.
    """
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 1) Select candidate topics:
    #    - if target provided: topics in that course
    #    - else: topics where the user has progress OR is enrolled
    topic_q = db.query(models.Topic)

    if target:
        topic_q = topic_q.filter(models.Topic.course_code == target)

    # 2) Rank by progress rating ASC (weakest first); unseen topics treated as lowest
    #    Left join to include topics with no progress row (NULL rating → treat as 0.200 baseline)
    topic_with_prog = (
        db.query(
            models.Topic,
            func.coalesce(models.TopicProgress.rating, 0.200).label("r"),
            models.TopicProgress.last_seen_at,
        )
        .outerjoin(models.TopicProgress,
                   (models.TopicProgress.topic_id == models.Topic.id) &
                   (models.TopicProgress.user_id == user.id))
    )
    if target:
        topic_with_prog = topic_with_prog.filter(models.Topic.course_code == target)

    topic_with_prog = (
        topic_with_prog
        .order_by(
            func.coalesce(models.TopicProgress.rating, 0.200).asc(),
            models.TopicProgress.last_seen_at.asc().nullsfirst(),
        )
        .limit(20)  # keep the candidate set small
        .all()
    )

    if not topic_with_prog:
        raise HTTPException(status_code=404, detail="No topics available for gating")

    # 3) For each candidate topic, pick a question the user hasn't seen recently
    from datetime import datetime, timedelta, timezone
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=RECENT_ANSWER_CUTOFF_MIN)

    for topic, _, _ in topic_with_prog:
        # Exclude questions answered in the last N minutes
        recent_q_ids = (
            db.query(models.QuestionAttempt.question_id)
            .join(models.Question, models.Question.id == models.QuestionAttempt.question_id)
            .filter(
                models.Question.topic_id == topic.id,
                models.QuestionAttempt.user_id == user.id,
                models.QuestionAttempt.answered_at >= cutoff,
            )
            .all()
        )
        recent_q_ids = {row[0] for row in recent_q_ids}

        q = (
            db.query(models.Question)
            .filter(models.Question.topic_id == topic.id)
            .filter(~models.Question.id.in_(recent_q_ids) if recent_q_ids else True)
            .order_by(func.random())   # simple random; good enough for MVP
            .first()
        )
        if q:
            return schemas.GateQuestion(
                attempt_id=None,  # client will POST an attempt; server generates id server-side
                question=schemas.QuestionOut(
                    id=str(q.id),
                    topic_id=str(q.topic_id),
                    prompt=q.prompt,
                    choices=q.choices,
                    difficulty=q.difficulty,
                    explanation=q.explanation or "",
                ),
                policy=schemas.GatePolicy(allow_ms_on_correct=ONE_HOUR_MS),
            )

    # If we got here, there are topics but no eligible questions
    raise HTTPException(status_code=404, detail="No eligible questions found (try again shortly)")


@router.post("/answer", response_model=schemas.GateAnswerResult)
def gate_answer(body: schemas.AttemptCreateWithUser, db: Session = Depends(get_db)):
    """
    Verify an answer in the gate flow, update progress and streaks,
    and return whether to unlock (allow_ms).
    """
    user = db.get(models.User, body.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    q = db.get(models.Question, body.question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if body.answer_index < 0 or body.answer_index > 3:
        raise HTTPException(status_code=400, detail="answer_index must be 0..3")

    is_correct = (body.answer_index == q.correct_index)

    # Record attempt
    attempt = models.QuestionAttempt(
        user_id=user.id,
        question_id=q.id,
        was_correct=is_correct,
        seconds=body.seconds,
    )
    db.add(attempt)

    # Update topic progress
    prog = (
        db.query(models.TopicProgress)
        .filter(
            models.TopicProgress.user_id == user.id,
            models.TopicProgress.topic_id == q.topic_id,
        )
        .first()
    )
    if prog is None:
        prog = models.TopicProgress(user_id=user.id, topic_id=q.topic_id, rating=0.200)
        db.add(prog)

    new_rating = update_rating(float(prog.rating), is_correct, q.difficulty, float(body.seconds))
    prog.rating = new_rating
    from datetime import datetime, timezone
    prog.last_seen_at = datetime.now(timezone.utc)

    # Update daily streaks
    update_streak(db, user.id)

    # Commit once
    db.commit()
    db.refresh(prog)

    # Unlock window only on correct answers
    allow_ms = ONE_HOUR_MS if is_correct else 0

    return schemas.GateAnswerResult(
        correct=is_correct,
        allow_ms=allow_ms,
        explanation=q.explanation or "",
        topic_id=str(q.topic_id),
        stage=stage_from_rating(float(prog.rating)),
    )
