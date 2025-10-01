from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import Base, engine
from backend.migrations import run_startup_migrations
from backend.routers import auth, courses, gate, students

app = FastAPI(title="UniMind API")

Base.metadata.create_all(bind=engine)
run_startup_migrations(engine)

app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(students.router)
app.include_router(gate.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://uni-mind-inky.vercel.app/",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}
