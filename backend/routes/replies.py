"""
routes/replies.py
-----------------
GET  /posts/{post_id}/replies  – fetch thread replies
POST /posts/{post_id}/replies  – post a voice reply
"""

import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.models import User, VoicePost, VoiceReply
from backend.schemas.schemas import RepliesResponse, VoiceReplyOut
from backend.services.auth import require_existing_user
from backend.services.moderation import moderate_audio
from backend.services.storage import upload_audio

router = APIRouter(prefix="/posts", tags=["replies"])

@router.get("/{post_id}/replies", response_model=RepliesResponse)
async def get_replies(post_id: str, db: AsyncSession = Depends(get_db)):
    now = datetime.utcnow()
    stmt = (
        select(VoiceReply)
        .where(
            VoiceReply.post_id == post_id,
            VoiceReply.flagged == False,
            VoiceReply.expires_at > now,
        )
        .order_by(VoiceReply.created_at.asc())
    )
    result = await db.execute(stmt)
    replies = result.scalars().all()
    return {"replies": replies}


@router.post(
    "/{post_id}/replies",
    response_model=VoiceReplyOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_reply(
    post_id:  str,
    audio:    UploadFile = File(...),
    mood:     str        = Form("Lonely"),
    duration: int        = Form(...),
    anon_id:  str        = Form(...),
    db:       AsyncSession = Depends(get_db),
):
    # Verify parent post exists and hasn't expired
    result = await db.execute(select(VoicePost).where(VoicePost.id == post_id))
    post = result.scalar_one_or_none()
    if not post or post.expires_at < datetime.utcnow():
        raise HTTPException(status_code=404, detail="Post not found or expired")

    user = await require_existing_user(db, anon_id)
    if user.shadow_ban:
        raise HTTPException(status_code=403, detail="Account restricted")

    audio_bytes = await audio.read()
    flagged, transcript = await moderate_audio(audio_bytes)
    audio_url = await upload_audio(audio_bytes, filename=f"reply_{uuid.uuid4()}.webm")

    reply = VoiceReply(
        id=str(uuid.uuid4()),
        post_id=post_id,
        user_id=anon_id,
        audio_url=audio_url,
        duration=min(max(duration, 1), 45),
        mood=mood,
        transcript=transcript,
        flagged=flagged,
        expires_at=post.expires_at,  # reply inherits parent expiry
    )
    db.add(reply)
    await db.flush()
    return reply
