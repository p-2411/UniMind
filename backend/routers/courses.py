from fastapi import APIRouter

router = APIRouter()

@router.get("/courses")
def list_courses():
    return [{"code" : "COMP1100", "name" : "Intro to Comp Sci"},
            {"code" : "COMP1110", "name" : "Intro to Java"},
            {"code" : "COMP1600", "name" : "Intro to Computations"}]

@router.post("/courses")
def create_course():
    # add course to DB by sending JSON
    return [{"code" : "COMP1100", "name" : "Intro to Comp Sci"},
            {"code" : "COMP1110", "name" : "Intro to Java"},
            {"code" : "COMP1600", "name" : "Intro to Computations"}]

@router.get("/courses/{course_code}")
def get_course_details(course_code):
    return [{ "code" : "COMP1100", "name" : "Intro to Comp Sci"}]


@router.put("/courses/{course_code}")
def update_course(course_code, new_course_code, new_course_name):
    # update course by sending JSON of new Course details
    return [{"code" : "COMP1100", "name" : "Intro to Comp Sci"},
            {"code" : "COMP1110", "name" : "Intro to Java"},
            {"code" : "COMP1600", "name" : "Intro to Computations"}]

@router.put("/courses/{course_code}")
def delete_course(course_code):
    #Remove course with that code
    return {"message": "Course deleted succesfully"}
