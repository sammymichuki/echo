from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.models import PostShare, PostView, Reaction, Repost, SavedPost, VoiceReply

REACTION_EMOJIS = ("🤍", "🫂", "💭")


def _empty_metrics():
    return {
        "reply_count": 0,
        "reaction_count": 0,
        "reaction_counts": {emoji: 0 for emoji in REACTION_EMOJIS},
        "repost_count": 0,
        "view_count": 0,
        "share_count": 0,
        "save_count": 0,
        "viewer_reaction": None,
        "viewer_reposted": False,
        "viewer_saved": False,
        "reply_preview": [],
    }


async def get_post_metrics(
    db: AsyncSession,
    post_ids: list[str],
    viewer_id: str | None = None,
    now: datetime | None = None,
) -> dict[str, dict]:
    if not post_ids:
        return {}

    now = now or datetime.utcnow()
    ids = list(dict.fromkeys(post_ids))
    metrics = {post_id: _empty_metrics() for post_id in ids}

    reply_rows = await db.execute(
        select(VoiceReply.post_id, func.count(VoiceReply.id))
        .where(
            VoiceReply.post_id.in_(ids),
            VoiceReply.flagged == False,
            VoiceReply.expires_at > now,
        )
        .group_by(VoiceReply.post_id)
    )
    for post_id, count in reply_rows.all():
        metrics[post_id]["reply_count"] = count or 0

    reaction_rows = await db.execute(
        select(Reaction.post_id, Reaction.emoji, func.count(Reaction.id))
        .where(Reaction.post_id.in_(ids))
        .group_by(Reaction.post_id, Reaction.emoji)
    )
    for post_id, emoji, count in reaction_rows.all():
        if emoji not in metrics[post_id]["reaction_counts"]:
            metrics[post_id]["reaction_counts"][emoji] = 0
        metrics[post_id]["reaction_counts"][emoji] = count or 0
        metrics[post_id]["reaction_count"] += count or 0

    repost_rows = await db.execute(
        select(Repost.post_id, func.count(Repost.id))
        .where(Repost.post_id.in_(ids))
        .group_by(Repost.post_id)
    )
    for post_id, count in repost_rows.all():
        metrics[post_id]["repost_count"] = count or 0

    view_rows = await db.execute(
        select(PostView.post_id, func.count(PostView.id))
        .where(PostView.post_id.in_(ids))
        .group_by(PostView.post_id)
    )
    for post_id, count in view_rows.all():
        metrics[post_id]["view_count"] = count or 0

    share_rows = await db.execute(
        select(PostShare.post_id, func.count(PostShare.id))
        .where(PostShare.post_id.in_(ids))
        .group_by(PostShare.post_id)
    )
    for post_id, count in share_rows.all():
        metrics[post_id]["share_count"] = count or 0

    save_rows = await db.execute(
        select(SavedPost.post_id, func.count(SavedPost.id))
        .where(SavedPost.post_id.in_(ids))
        .group_by(SavedPost.post_id)
    )
    for post_id, count in save_rows.all():
        metrics[post_id]["save_count"] = count or 0

    reply_preview_rows = await db.execute(
        select(VoiceReply)
        .where(
            VoiceReply.post_id.in_(ids),
            VoiceReply.flagged == False,
            VoiceReply.expires_at > now,
        )
        .order_by(VoiceReply.post_id.asc(), VoiceReply.created_at.desc())
    )
    reply_preview_counts = {post_id: 0 for post_id in ids}
    for reply in reply_preview_rows.scalars().all():
        if reply_preview_counts[reply.post_id] >= 2:
            continue
        metrics[reply.post_id]["reply_preview"].append(
            {
                "id": reply.id,
                "user_id": reply.user_id,
                "mood": reply.mood,
                "created_at": reply.created_at,
            }
        )
        reply_preview_counts[reply.post_id] += 1

    if viewer_id:
        viewer_reactions = await db.execute(
            select(Reaction.post_id, Reaction.emoji)
            .where(Reaction.post_id.in_(ids), Reaction.user_id == viewer_id)
        )
        for post_id, emoji in viewer_reactions.all():
            metrics[post_id]["viewer_reaction"] = emoji

        viewer_reposts = await db.execute(
            select(Repost.post_id).where(Repost.post_id.in_(ids), Repost.user_id == viewer_id)
        )
        for (post_id,) in viewer_reposts.all():
            metrics[post_id]["viewer_reposted"] = True

        viewer_saves = await db.execute(
            select(SavedPost.post_id).where(SavedPost.post_id.in_(ids), SavedPost.user_id == viewer_id)
        )
        for (post_id,) in viewer_saves.all():
            metrics[post_id]["viewer_saved"] = True

    return metrics


def serialize_post(post, metrics_by_post_id: dict[str, dict]) -> dict:
    return {
        **post.__dict__,
        **metrics_by_post_id.get(post.id, _empty_metrics()),
    }
