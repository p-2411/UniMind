from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.course import Course
from backend.models.user import User
from backend.schemas.course import CourseCreate, CourseOut, CourseUpdate

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=list[CourseOut])
def list_courses(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    courses = db.query(Course).order_by(Course.created_at.desc()).all()
    return courses


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    code = payload.code.upper()
    if db.get(Course, code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Course code already exists")

    course = Course(code=code, name=payload.name, description=payload.description)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/{course_code}", response_model=CourseOut)
def get_course(
    course_code: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    course = db.get(Course, course_code.upper())
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


@router.patch("/{course_code}", response_model=CourseOut)
def update_course(
    course_code: str,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    course = db.get(Course, course_code.upper())
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if payload.name is not None:
        course.name = payload.name
    if payload.description is not None:
        course.description = payload.description

    db.commit()
    db.refresh(course)
    return course
