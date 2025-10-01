from __future__ import annotations

import os

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

DEFAULT_ALLOWED_ORIGINS = [
    "https://uni-mind-inky.vercel.app",
    "https://unimind-production.up.railway.app",
    "http://unimind-production.up.railway.app",
    "http://localhost:5173",
    "https://localhost:5173",
    "http://localhost:3000",
    "http://localhost:5174",
    "http://localhost:8000",
    "chrome-extension://pdiblfhdlnnlikbllnkfodhfopkokecm",  # prham extension ID
    "chrome-extension://kjhiacblldmmkpkjlnieaidenajibhhf",  # arnav extension ID
    "chrome-extension://aofknjefemhijhenfpkgijgddceccmjl",  # suman extension ID
]


def get_allowed_origins() -> list[str]:
    raw = os.getenv("CORS_ALLOW_ORIGINS")
    if not raw:
        return DEFAULT_ALLOWED_ORIGINS
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or DEFAULT_ALLOWED_ORIGINS


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}
