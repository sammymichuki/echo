"""
routes/views.py
---------------
POST /posts/{post_id}/views  – record one view per user per post
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.models import PostView, VoicePost
from backend.schemas.schemas import ToggleActorIn, ViewOut
from backend.services.auth import require_existing_user
from backend.services.post_metrics import get_post_metrics

router = APIRouter(prefix="/posts", tags=["views"])

@router.post("/{post_id}/views", response_model=ViewOut)
async def record_view(
    post_id: str,
    body: ToggleActorIn,
    db: AsyncSession = Depends(get_db),
):
    post_result = await db.execute(select(VoicePost).where(VoicePost.id == post_id))
    if not post_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")

    await require_existing_user(db, body.anon_id)

    existing = await db.execute(
        select(PostView).where(PostView.post_id == post_id, PostView.user_id == body.anon_id)
    )
    viewed = existing.scalar_one_or_none() is not None

    if not viewed:
        db.add(PostView(post_id=post_id, user_id=body.anon_id))
        await db.flush()

    metrics = await get_post_metrics(db, [post_id], viewer_id=body.anon_id)
    post_metrics = metrics.get(post_id, {})
    return {
        "viewed": True,
        "view_count": post_metrics.get("view_count", 0),
    }
