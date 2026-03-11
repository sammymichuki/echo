"""
routes/reactions.py
-------------------
POST /posts/{post_id}/reactions  – toggle reaction (one per user per post)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.models import Reaction, VoicePost
from backend.schemas.schemas import ReactionIn, ReactionOut
from backend.services.auth import require_existing_user
from backend.services.post_metrics import get_post_metrics

router = APIRouter(prefix="/posts", tags=["reactions"])

VALID_EMOJIS = {"🤍", "🫂", "💭"}


@router.post("/{post_id}/reactions", response_model=ReactionOut)
async def toggle_reaction(
    post_id: str,
    body:    ReactionIn,
    db:      AsyncSession = Depends(get_db),
):
    if body.emoji not in VALID_EMOJIS:
        raise HTTPException(status_code=422, detail="Invalid reaction emoji")

    await require_existing_user(db, body.anon_id)

    # Verify post exists
    post_result = await db.execute(select(VoicePost).where(VoicePost.id == post_id))
    if not post_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Post not found")

    # Check existing reaction (one per user per post)
    existing = await db.execute(
        select(Reaction).where(
            Reaction.post_id == post_id,
            Reaction.user_id == body.anon_id,
        )
    )
    reaction = existing.scalar_one_or_none()

    if reaction:
        # Toggle off if same emoji, else swap
        if reaction.emoji == body.emoji:
            await db.delete(reaction)
            reacted = False
        else:
            reaction.emoji = body.emoji
            reacted = True
    else:
        new_r = Reaction(post_id=post_id, user_id=body.anon_id, emoji=body.emoji)
        db.add(new_r)
        reacted = True

    await db.flush()
    metrics = await get_post_metrics(db, [post_id], viewer_id=body.anon_id)
    post_metrics = metrics.get(post_id, {})
    return {
        "reacted": reacted,
        "emoji": body.emoji,
        "reaction_count": post_metrics.get("reaction_count", 0),
        "reaction_counts": post_metrics.get("reaction_counts", {}),
        "viewer_reaction": post_metrics.get("viewer_reaction"),
    }
