from .courses import router as courses_router
from .students import router as students_router
from .gate import router as gate_router
# from .auth import router as auth_router   # uncomment if/when you add auth

all_routers = [
    courses_router,
    students_router,
    gate_router,
    # auth_router,
]
