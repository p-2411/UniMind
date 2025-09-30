from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models, schemas

router = APIRouter(
    prefix="/courses",   # all endpoints here start with /courses
    tags=["courses"],    # for Swagger docs grouping
)

# GET /courses → list all courses
@router.get("/", response_model=list[schemas.CourseOut])
def list_courses(db: Session = Depends(get_db)):
    """
    Returns all courses in the system.
    """
    return db.query(models.Course).all()


# GET /courses/{code} → get course details
@router.get("/{code}", response_model=schemas.CourseOut)
def get_course(code: str, db: Session = Depends(get_db)):
    """
    Fetch a single course by its code (e.g., COMP2521).
    """
    course = db.query(models.Course).filter(models.Course.code == code).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


# POST /courses → create a new course
@router.post("/", response_model=schemas.CourseOut)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    """
    Create a new course. Requires unique course code.
    """
    existing = db.query(models.Course).filter(models.Course.code == course.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Course already exists")

    new_course = models.Course(code=course.code, name=course.name)
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return new_course


# PUT /courses/{code} → update course info
@router.put("/{code}", response_model=schemas.CourseOut)
def update_course(code: str, course: schemas.CourseUpdate, db: Session = Depends(get_db)):
    """
    Update an existing course’s details (like its name).
    """
    db_course = db.query(models.Course).filter(models.Course.code == code).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_course.name = course.name
    db.commit()
    db.refresh(db_course)
    return db_course


# DELETE /courses/{code} → remove a course
@router.delete("/{code}")
def delete_course(code: str, db: Session = Depends(get_db)):
    """
    Delete a course by its code. Cascades to topics, subtopics, etc.
    """
    db_course = db.query(models.Course).filter(models.Course.code == code).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")

    db.delete(db_course)
    db.commit()
    return {"detail": f"Course {code} deleted"}
