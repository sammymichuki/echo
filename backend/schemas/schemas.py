"""
schemas/schemas.py
------------------
Pydantic v2 request/response models for all routes.
"""

from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# ── VoicePost ─────────────────────────────────────────────────────────────
class VoicePostOut(BaseModel):
    id:           str
    user_id:      str
    audio_url:    str
    duration:     int
    mood:         str
    reply_count:  int  = 0
    reaction_count: int = 0
    reaction_counts: dict[str, int] = Field(default_factory=dict)
    repost_count: int = 0
    view_count: int = 0
    share_count: int = 0
    save_count: int = 0
    viewer_reaction: Optional[str] = None
    viewer_reposted: bool = False
    viewer_saved: bool = False
    reply_preview: List["ReplyPreviewOut"] = Field(default_factory=list)
    created_at:   datetime
    expires_at:   datetime

    model_config = {"from_attributes": True}


class FeedResponse(BaseModel):
    posts: List[VoicePostOut]
    total: int


class ReplyPreviewOut(BaseModel):
    id: str
    user_id: str
    mood: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── VoiceReply ────────────────────────────────────────────────────────────
class VoiceReplyOut(BaseModel):
    id:         str
    post_id:    str
    user_id:    str
    audio_url:  str
    duration:   int
    mood:       str
    created_at: datetime

    model_config = {"from_attributes": True}


class RepliesResponse(BaseModel):
    replies: List[VoiceReplyOut]


class UserPostWithRepliesOut(VoicePostOut):
    replies: List[VoiceReplyOut] = []


class ParentPostRefOut(BaseModel):
    id: str
    user_id: str
    mood: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserReplyWithParentOut(VoiceReplyOut):
    parent_post: ParentPostRefOut


class UserPostsResponse(BaseModel):
    anon_id: str
    posts: List[UserPostWithRepliesOut]
    wrote_replies: List[UserReplyWithParentOut] = []


# ── Auth ──────────────────────────────────────────────────────────────────
class SessionIn(BaseModel):
    token: str


class RecoveryIn(BaseModel):
    recovery_code: str


class AuthSessionOut(BaseModel):
    anon_id: str
    auth_token: str
    recovery_code: Optional[str] = None


# ── Reaction ──────────────────────────────────────────────────────────────
class ReactionIn(BaseModel):
    emoji:   str = Field(..., pattern=r"^(🤍|🫂|💭)$")
    anon_id: str

class ReactionOut(BaseModel):
    reacted: bool
    emoji:   str
    reaction_count: int = 0
    reaction_counts: dict[str, int] = Field(default_factory=dict)
    viewer_reaction: Optional[str] = None


class ToggleActorIn(BaseModel):
    anon_id: str


class RepostOut(BaseModel):
    reposted: bool
    repost_count: int = 0
    viewer_reposted: bool = False


class ViewOut(BaseModel):
    viewed: bool
    view_count: int = 0


class ShareOut(BaseModel):
    shared: bool
    share_count: int = 0


class SaveOut(BaseModel):
    saved: bool
    save_count: int = 0
    viewer_saved: bool = False


# ── Report ────────────────────────────────────────────────────────────────
class ReportIn(BaseModel):
    reason: str = Field(default="other", max_length=128)

class ReportOut(BaseModel):
    reported: bool
    shadow_banned: bool = False


VoicePostOut.model_rebuild()
