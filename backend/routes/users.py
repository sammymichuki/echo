"""
routes/users.py
---------------
GET /users/{anon_id}/posts  – fetch one anonymous account and its posts + replies
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from backend.database import get_db
from backend.models.models import User, VoicePost, VoiceReply
from backend.schemas.schemas import UserPostsResponse
from backend.services.post_metrics import get_post_metrics, serialize_post

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{anon_id}/posts", response_model=UserPostsResponse)
async def get_user_posts(
    anon_id: str,
    viewer_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()

    user_result = await db.execute(select(User).where(User.id == anon_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    posts_result = await db.execute(
        select(VoicePost)
        .where(
            VoicePost.user_id == anon_id,
            VoicePost.flagged == False,
            VoicePost.expires_at > now,
        )
        .order_by(VoicePost.created_at.desc())
    )
    posts = posts_result.scalars().all()

    post_ids = [p.id for p in posts]
    replies_by_post_id = {post_id: [] for post_id in post_ids}

    if post_ids:
        replies_result = await db.execute(
            select(VoiceReply)
            .where(
                VoiceReply.post_id.in_(post_ids),
                VoiceReply.flagged == False,
                VoiceReply.expires_at > now,
            )
            .order_by(VoiceReply.created_at.asc())
        )
        for reply in replies_result.scalars().all():
            replies_by_post_id.setdefault(reply.post_id, []).append(reply)

    wrote_replies_result = await db.execute(
        select(VoiceReply)
        .where(
            VoiceReply.user_id == anon_id,
            VoiceReply.flagged == False,
            VoiceReply.expires_at > now,
        )
        .order_by(VoiceReply.created_at.desc())
    )
    wrote_replies = wrote_replies_result.scalars().all()

    parent_post_ids = list({r.post_id for r in wrote_replies})
    parent_posts_by_id = {}
    if parent_post_ids:
        parent_posts_result = await db.execute(
            select(VoicePost)
            .where(
                VoicePost.id.in_(parent_post_ids),
                VoicePost.flagged == False,
                VoicePost.expires_at > now,
            )
        )
        parent_posts_by_id = {p.id: p for p in parent_posts_result.scalars().all()}

    wrote_replies_payload = [
        {**reply.__dict__, "parent_post": parent_posts_by_id[reply.post_id]}
        for reply in wrote_replies
        if reply.post_id in parent_posts_by_id
    ]

    metrics = await get_post_metrics(db, post_ids, viewer_id=viewer_id, now=now)
    enriched_posts = []
    for post in posts:
        enriched = serialize_post(post, metrics)
        enriched["replies"] = replies_by_post_id.get(post.id, [])
        enriched_posts.append(enriched)

    return {"anon_id": anon_id, "posts": enriched_posts, "wrote_replies": wrote_replies_payload}
