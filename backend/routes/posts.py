"""
routes/posts.py
---------------
GET  /posts                – paginated feed
GET  /posts/{id}           – single post
POST /posts                – upload new voice post (multipart)
POST /posts/{id}/report    – report a post
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.models import Reaction, Report, User, VoicePost, VoiceReply
from backend.schemas.schemas import FeedResponse, ReportIn, ReportOut, VoicePostOut
from backend.services.auth import require_existing_user
from backend.services.moderation import moderate_audio
from backend.services.post_metrics import get_post_metrics, serialize_post
from backend.services.storage import upload_audio

router = APIRouter(prefix="/posts", tags=["posts"])

SHADOW_BAN_THRESHOLD = 3  # reports before shadow ban


# ── Helpers ────────────────────────────────────────────────────────────────
# ── Routes ─────────────────────────────────────────────────────────────────
@router.get("", response_model=FeedResponse)
async def get_feed(
    limit:  int = 20,
    offset: int = 0,
    mood:   Optional[str] = None,
    window: Optional[str] = None,  # "last_hour" | "today"
    viewer_id: Optional[str] = None,
    db:     AsyncSession = Depends(get_db),
):
    """Return live, non-flagged voice posts ordered by newest first."""
    now = datetime.utcnow()
    conditions = [VoicePost.flagged == False, VoicePost.expires_at > now]

    if mood and mood != "All":
        conditions.append(VoicePost.mood == mood)

    if window == "last_hour":
        conditions.append(VoicePost.created_at >= now - timedelta(hours=1))
    elif window == "today":
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        conditions.append(VoicePost.created_at >= start_of_day)

    stmt = (
        select(VoicePost)
        .where(*conditions)
        .order_by(VoicePost.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    posts = result.scalars().all()

    total_result = await db.execute(
        select(func.count()).select_from(VoicePost)
        .where(*conditions)
    )
    total = total_result.scalar() or 0

    metrics = await get_post_metrics(db, [post.id for post in posts], viewer_id=viewer_id, now=now)
    enriched = [serialize_post(post, metrics) for post in posts]
    return {"posts": enriched, "total": total}


@router.get("/{post_id}", response_model=VoicePostOut)
async def get_post(
    post_id: str,
    viewer_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(VoicePost).where(VoicePost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    metrics = await get_post_metrics(db, [post.id], viewer_id=viewer_id)
    return serialize_post(post, metrics)


@router.post("", response_model=VoicePostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    audio:    UploadFile = File(...),
    mood:     str        = Form("Lonely"),
    duration: int        = Form(...),
    anon_id:  str        = Form(...),
    db:       AsyncSession = Depends(get_db),
):
    user = await require_existing_user(db, anon_id)

    if user.shadow_ban:
        raise HTTPException(status_code=403, detail="Account restricted")

    # Moderation: speech-to-text + toxicity check
    audio_bytes = await audio.read()
    flagged, transcript = await moderate_audio(audio_bytes)

    # Upload to cloud storage
    audio_url = await upload_audio(audio_bytes, filename=f"{uuid.uuid4()}.webm")

    post = VoicePost(
        id=str(uuid.uuid4()),
        user_id=anon_id,
        audio_url=audio_url,
        duration=min(max(duration, 1), 60),
        mood=mood,
        transcript=transcript,
        flagged=flagged,
        expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(post)
    await db.flush()
    metrics = await get_post_metrics(db, [post.id], viewer_id=anon_id)
    return serialize_post(post, metrics)


@router.post("/{post_id}/report", response_model=ReportOut)
async def report_post(
    post_id:   str,
    body:      ReportIn,
    anon_id:   str,        # passed as query param for simplicity
    db:        AsyncSession = Depends(get_db),
):
    result = await db.execute(select(VoicePost).where(VoicePost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    await require_existing_user(db, anon_id)

    report = Report(post_id=post_id, reporter_id=anon_id, reason=body.reason)
    db.add(report)

    post.report_count += 1
    shadow_banned = False
    if post.report_count >= SHADOW_BAN_THRESHOLD:
        post.flagged = True
        # Shadow-ban the author
        author_result = await db.execute(select(User).where(User.id == post.user_id))
        author = author_result.scalar_one_or_none()
        if author:
            author.shadow_ban = True
            shadow_banned = True

    return {"reported": True, "shadow_banned": shadow_banned}
