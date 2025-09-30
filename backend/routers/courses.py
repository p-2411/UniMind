from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.course import Course
from backend.schemas.course import (
    CourseCreateRequest,
    CourseUpdateRequest,
    CourseResponse,
)
from backend.services.ai import analyze_course_content

router = APIRouter(tags=["courses"])


@router.get("/courses", response_model=list[CourseResponse])
def list_courses(db: Session = Depends(get_db)):
    courses = db.query(Course).order_by(Course.created_at.desc()).all()
    return courses


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreateRequest, db: Session = Depends(get_db)):
    course = Course(
        name=payload.name,
        slides_content=payload.slides_content,
        analysis=None,
        questions=[],
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course_details(course_id: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.patch("/courses/{course_id}", response_model=CourseResponse)
def update_course(course_id: str, payload: CourseUpdateRequest, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if payload.name is not None:
        course.name = payload.name
    if payload.slides_content is not None:
        course.slides_content = payload.slides_content
    db.commit()
    db.refresh(course)
    return course


@router.post("/courses/{course_id}/analyze", response_model=CourseResponse)
def analyze_course(course_id: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if not course.slides_content or len(course.slides_content.strip()) == 0:
        raise HTTPException(status_code=400, detail="Course has no slides_content to analyze")

    analysis, questions = analyze_course_content(course.name, course.slides_content)
    course.analysis = analysis
    course.questions = questions
    db.commit()
    db.refresh(course)
    return course
