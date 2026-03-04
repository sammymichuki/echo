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
    created_at:   datetime
    expires_at:   datetime

    model_config = {"from_attributes": True}


class FeedResponse(BaseModel):
    posts: List[VoicePostOut]
    total: int


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


# ── Reaction ──────────────────────────────────────────────────────────────
class ReactionIn(BaseModel):
    emoji:   str = Field(..., pattern=r"^(🤍|🫂|💭)$")
    anon_id: str

class ReactionOut(BaseModel):
    reacted: bool
    emoji:   str


# ── Report ────────────────────────────────────────────────────────────────
class ReportIn(BaseModel):
    reason: str = Field(default="other", max_length=128)

class ReportOut(BaseModel):
    reported: bool
    shadow_banned: bool = False
