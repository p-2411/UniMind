from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.attempt import QuestionAttempt
from backend.models.question import Question
from backend.models.topic import Topic
from backend.models.user import User
from backend.schemas import GateAnswerRequest, GateAnswerResult, GatePolicy, GateQuestion
from backend.services.progress import apply_attempt, ensure_topic_progress
from backend.services.streaks import update_streak

router = APIRouter(prefix="/gate", tags=["gate"])

ONE_HOUR_MS = 60 * 60 * 1000


def _policy() -> GatePolicy:
    return GatePolicy(allow_ms_on_correct=ONE_HOUR_MS, lockout_seconds_on_fail=30)


@router.get("/question", response_model=GateQuestion)
def gate_question(
    target: str | None = Query(default=None, description="Optional course code filter"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(Question, Topic).join(Topic, Topic.id == Question.topic_id)
    if target:
        query = query.filter(Topic.course_code == target.upper())

    question_topic = query.order_by(func.random()).first()
    if not question_topic:
        raise HTTPException(status_code=404, detail="No questions available for gating")

    question, topic = question_topic

    return GateQuestion(
        question_id=question.id,
        topic_id=topic.id,
        topic_name=topic.name,
        prompt=question.prompt,
        choices=question.choices,
        difficulty=question.difficulty,
        policy=_policy(),
    )


@router.post("/answer", response_model=GateAnswerResult)
def gate_answer(
    payload: GateAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = db.get(Question, payload.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if payload.answer_index >= len(question.choices):
        raise HTTPException(status_code=400, detail="answer_index out of range")

    is_correct = payload.answer_index == question.correct_index

    progress = ensure_topic_progress(db, current_user.id, question.topic_id)
    apply_attempt(progress, is_correct, payload.seconds)

    attempt = QuestionAttempt(
        user_id=current_user.id,
        question_id=question.id,
        was_correct=is_correct,
        seconds=payload.seconds or 0,
    )
    db.add(attempt)

    update_streak(db, current_user.id, datetime.utcnow())

    db.commit()
    db.refresh(progress)

    allow_ms = ONE_HOUR_MS if is_correct else 0

    return GateAnswerResult(
        correct=is_correct,
        allow_ms=allow_ms,
        explanation=question.explanation or "",
        topic_id=question.topic_id,
        stage=progress.stage,
        percent_complete=progress.percent_complete,
    )
