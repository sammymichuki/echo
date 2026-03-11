"""
routes/saves.py
---------------
POST /posts/{post_id}/saves  – toggle save/bookmark
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.models import SavedPost, VoicePost
from backend.schemas.schemas import SaveOut, ToggleActorIn
from backend.services.auth import require_existing_user
from backend.services.post_metrics import get_post_metrics

router = APIRouter(prefix="/posts", tags=["saves"])

@router.post("/{post_id}/saves", response_model=SaveOut)
async def toggle_save(
    post_id: str,
    body: ToggleActorIn,
    db: AsyncSession = Depends(get_db),
):
    post_result = await db.execute(select(VoicePost).where(VoicePost.id == post_id))
    if not post_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")

    await require_existing_user(db, body.anon_id)

    existing = await db.execute(
        select(SavedPost).where(SavedPost.post_id == post_id, SavedPost.user_id == body.anon_id)
    )
    saved_post = existing.scalar_one_or_none()

    if saved_post:
        await db.delete(saved_post)
        saved = False
    else:
        db.add(SavedPost(post_id=post_id, user_id=body.anon_id))
        saved = True

    await db.flush()
    metrics = await get_post_metrics(db, [post_id], viewer_id=body.anon_id)
    post_metrics = metrics.get(post_id, {})
    return {
        "saved": saved,
        "save_count": post_metrics.get("save_count", 0),
        "viewer_saved": post_metrics.get("viewer_saved", False),
    }
