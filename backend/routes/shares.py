"""
routes/shares.py
----------------
POST /posts/{post_id}/shares  – record a successful share
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.models import PostShare, VoicePost
from backend.schemas.schemas import ShareOut, ToggleActorIn
from backend.services.auth import require_existing_user
from backend.services.post_metrics import get_post_metrics

router = APIRouter(prefix="/posts", tags=["shares"])

@router.post("/{post_id}/shares", response_model=ShareOut)
async def record_share(
    post_id: str,
    body: ToggleActorIn,
    db: AsyncSession = Depends(get_db),
):
    post_result = await db.execute(select(VoicePost).where(VoicePost.id == post_id))
    if not post_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")

    await require_existing_user(db, body.anon_id)
    db.add(PostShare(post_id=post_id, user_id=body.anon_id))
    await db.flush()

    metrics = await get_post_metrics(db, [post_id], viewer_id=body.anon_id)
    post_metrics = metrics.get(post_id, {})
    return {"shared": True, "share_count": post_metrics.get("share_count", 0)}
