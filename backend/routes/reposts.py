"""
routes/reposts.py
-----------------
POST /posts/{post_id}/reposts  – toggle repost (one per user per post)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.models import Repost, VoicePost
from backend.schemas.schemas import RepostOut, ToggleActorIn
from backend.services.auth import require_existing_user
from backend.services.post_metrics import get_post_metrics

router = APIRouter(prefix="/posts", tags=["reposts"])

@router.post("/{post_id}/reposts", response_model=RepostOut)
async def toggle_repost(
    post_id: str,
    body: ToggleActorIn,
    db: AsyncSession = Depends(get_db),
):
    post_result = await db.execute(select(VoicePost).where(VoicePost.id == post_id))
    if not post_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")

    await require_existing_user(db, body.anon_id)

    existing = await db.execute(
        select(Repost).where(Repost.post_id == post_id, Repost.user_id == body.anon_id)
    )
    repost = existing.scalar_one_or_none()

    if repost:
        await db.delete(repost)
        reposted = False
    else:
        db.add(Repost(post_id=post_id, user_id=body.anon_id))
        reposted = True

    await db.flush()
    metrics = await get_post_metrics(db, [post_id], viewer_id=body.anon_id)
    post_metrics = metrics.get(post_id, {})
    return {
        "reposted": reposted,
        "repost_count": post_metrics.get("repost_count", 0),
        "viewer_reposted": post_metrics.get("viewer_reposted", False),
    }
