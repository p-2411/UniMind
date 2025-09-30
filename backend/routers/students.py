from __future__ import annotations

# FastAPI plumbing (routing + errors + DB session injection)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# Local project imports: DB session factory, ORM models, pydantic schemas, business logic
from backend.database import get_db
from backend import models, schemas
from backend.services.progress_engine import update_rating, stage_from_rating
from backend.services.streaks import update_streak

router = APIRouter(
    prefix="/students",   # every path here starts with /students
    tags=["students"],    # groups in the Swagger UI
)

# ---------- Enrolments (users ↔ courses) ----------

@router.get("/{user_id}/enrolments", response_model=list[schemas.CourseOut])
def list_enrolments(user_id: str, db: Session = Depends(get_db)):
    """
    Return all courses the student is enrolled in.
    """
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Convenience: list via association rows (enrolments)
    # If you added relationship 'courses' on User, you could just: return user.courses
    rows = (
        db.query(models.Course)
        .join(models.Enrolment, models.Enrolment.course_code == models.Course.code)
        .filter(models.Enrolment.user_id == user_id)
        .all()
    )
    return rows


@router.post("/{user_id}/enrolments", status_code=201)
def enrol_student(user_id: str, payload: schemas.EnrolRequest, db: Session = Depends(get_db)):
    """
    Enrol a student in a course. Idempotent-ish: will 409 on duplicate.
    """
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    course = db.get(models.Course, payload.course_code)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Insert association row; composite PK(user_id, course_code) prevents duplicates
    db.add(models.Enrolment(user_id=user.id, course_code=course.code))
    try:
        db.commit()
    except Exception:
        db.rollback()
        # Likely a duplicate key (already enrolled)
        raise HTTPException(status_code=409, detail="Already enrolled in this course")

    return {"detail": f"Enrolled in {course.code}"}


@router.delete("/{user_id}/enrolments/{course_code}", status_code=204)
def unenrol_student(user_id: str, course_code: str, db: Session = Depends(get_db)):
    """
    Remove a student from a course.
    """
    row = (
        db.query(models.Enrolment)
        .filter(
            models.Enrolment.user_id == user_id,
            models.Enrolment.course_code == course_code,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Enrolment not found")

    db.delete(row)
    db.commit()
    return None


# ---------- Attempts (core learning loop) ----------

@router.post("/{user_id}/attempts", response_model=schemas.AttemptResult)
def submit_attempt(user_id: str, body: schemas.AttemptCreate, db: Session = Depends(get_db)):
    """
    Record an answer attempt, update topic progress, update daily streak,
    and return correctness + explanation + current stage.
    """
    # 1) Validate user
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2) Lookup question + basic validation
    q = db.get(models.Question, body.question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if body.answer_index < 0 or body.answer_index > 3:
        raise HTTPException(status_code=400, detail="answer_index must be 0..3")

    # 3) Compute correctness
    is_correct = (body.answer_index == q.correct_index)

    # 4) Insert attempt row
    attempt = models.QuestionAttempt(
        user_id=user.id,
        question_id=q.id,
        was_correct=is_correct,
        seconds=body.seconds,
    )
    db.add(attempt)

    # 5) Upsert TopicProgress (read current rating, default if missing)
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

    # 6) Calculate new rating via your algorithm
    new_rating = update_rating(float(prog.rating), is_correct, q.difficulty, float(body.seconds))
    prog.rating = new_rating
    # Touch last_seen so gate can prioritise other topics next time
    from datetime import datetime, timezone
    prog.last_seen_at = datetime.now(timezone.utc)

    # 7) Update streaks (consecutive active days)
    update_streak(db, user.id)  # service updates/creates DailyStreak row

    # 8) Persist everything atomically
    db.commit()
    db.refresh(prog)

    # 9) Return API-friendly result (don’t expose raw rating)
    return schemas.AttemptResult(
        correct=is_correct,
        explanation=q.explanation or "",
        topic_id=str(q.topic_id),
        stage=stage_from_rating(float(prog.rating)),
    )


# ---------- Progress (read-only for UI) ----------

@router.get("/{user_id}/progress", response_model=list[schemas.ProgressItem])
def list_progress(user_id: str, db: Session = Depends(get_db)):
    """
    Return progress for all topics the student has touched (or is enrolled in).
    """
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Join topics with progress; left join to show zero-touched topics if enrolled
    # For simplicity, show only topics with a progress row:
    rows = (
        db.query(models.Topic, models.TopicProgress)
        .join(models.TopicProgress, models.Topic.id == models.TopicProgress.topic_id)
        .filter(models.TopicProgress.user_id == user.id)
        .all()
    )

    out: list[schemas.ProgressItem] = []
    for topic, prog in rows:
        out.append(
            schemas.ProgressItem(
                topic_id=str(topic.id),
                topic_name=topic.name,
                course_code=topic.course_code,
                stage=stage_from_rating(float(prog.rating)),
            )
        )
    return out


@router.get("/{user_id}/progress/{topic_id}", response_model=schemas.ProgressItem)
def get_progress(user_id: str, topic_id: str, db: Session = Depends(get_db)):
    """
    Return progress for a specific topic (maps rating → Learn/Still Learning/Mastered).
    """
    prog = (
        db.query(models.TopicProgress)
        .filter(
            models.TopicProgress.user_id == user_id,
            models.TopicProgress.topic_id == topic_id,
        )
        .first()
    )
    topic = db.get(models.Topic, topic_id)

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if not prog:
        # No attempts yet → default stage
        return schemas.ProgressItem(
            topic_id=str(topic.id),
            topic_name=topic.name,
            course_code=topic.course_code,
            stage=stage_from_rating(0.200),
        )

    return schemas.ProgressItem(
        topic_id=str(topic.id),
        topic_name=topic.name,
        course_code=topic.course_code,
        stage=stage_from_rating(float(prog.rating)),
    )
