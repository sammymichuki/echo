"""
main.py
-------
FastAPI application entry point.
Start with:  uvicorn backend.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import engine, Base
from backend.routes import posts, replies, reactions, users

# ── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Echo API",
    description="Anonymous voice-only social network",
    version="0.1.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://echo.app",
    ],
    # Allow local frontend hosts regardless of dev/preview port (5173, 5174, 5175, 4173, etc).
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────────────────
app.include_router(posts.router)
app.include_router(replies.router)
app.include_router(reactions.router)
app.include_router(users.router)

# ── Static file serving for local audio uploads ────────────────────────────
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ── DB init on startup ─────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        # Creates tables that don't yet exist (non-destructive)
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health():
    return {"status": "ok"}
