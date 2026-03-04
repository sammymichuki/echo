"""
models/models.py
----------------
SQLAlchemy ORM table definitions, mirroring schema.sql exactly.
"""

from datetime import datetime, timedelta
import uuid

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    Integer, SmallInteger, String, Text,
)
from sqlalchemy.orm import relationship

from backend.database import Base


def new_id() -> str:
    return str(uuid.uuid4())


def default_expiry() -> datetime:
    return datetime.utcnow() + timedelta(hours=24)


# ── User ──────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id          = Column(String(36),  primary_key=True, default=new_id)
    device_hash = Column(String(64),  nullable=True)
    country     = Column(String(2),   nullable=True)
    shadow_ban  = Column(Boolean,     nullable=False, default=False)
    created_at  = Column(DateTime,    nullable=False, default=datetime.utcnow)

    posts   = relationship("VoicePost",  back_populates="user", cascade="all, delete-orphan")
    replies = relationship("VoiceReply", back_populates="user")


# ── VoicePost ─────────────────────────────────────────────────────────────
class VoicePost(Base):
    __tablename__ = "voice_posts"

    id           = Column(String(36),  primary_key=True, default=new_id)
    user_id      = Column(String(36),  ForeignKey("users.id"), nullable=False)
    audio_url    = Column(String(512), nullable=False)
    duration     = Column(SmallInteger, nullable=False)
    mood         = Column(String(32),  nullable=False, default="Lonely")
    transcript   = Column(Text,        nullable=True)
    flagged      = Column(Boolean,     nullable=False, default=False)
    report_count = Column(SmallInteger, nullable=False, default=0)
    expires_at   = Column(DateTime,    nullable=False, default=default_expiry)
    created_at   = Column(DateTime,    nullable=False, default=datetime.utcnow)

    user      = relationship("User",        back_populates="posts")
    replies   = relationship("VoiceReply",  back_populates="post", cascade="all, delete-orphan")
    reactions = relationship("Reaction",    back_populates="post", cascade="all, delete-orphan")
    reports   = relationship("Report",      back_populates="post", cascade="all, delete-orphan")


# ── VoiceReply ────────────────────────────────────────────────────────────
class VoiceReply(Base):
    __tablename__ = "voice_replies"

    id         = Column(String(36),  primary_key=True, default=new_id)
    post_id    = Column(String(36),  ForeignKey("voice_posts.id"), nullable=False)
    user_id    = Column(String(36),  ForeignKey("users.id"),       nullable=False)
    audio_url  = Column(String(512), nullable=False)
    duration   = Column(SmallInteger, nullable=False)
    mood       = Column(String(32),  nullable=False, default="Lonely")
    transcript = Column(Text,        nullable=True)
    flagged    = Column(Boolean,     nullable=False, default=False)
    expires_at = Column(DateTime,    nullable=False, default=default_expiry)
    created_at = Column(DateTime,    nullable=False, default=datetime.utcnow)

    post = relationship("VoicePost", back_populates="replies")
    user = relationship("User",      back_populates="replies")


# ── Reaction ──────────────────────────────────────────────────────────────
class Reaction(Base):
    __tablename__ = "reactions"

    id         = Column(Integer,     primary_key=True, autoincrement=True)
    post_id    = Column(String(36),  ForeignKey("voice_posts.id"), nullable=False)
    user_id    = Column(String(36),  ForeignKey("users.id"),       nullable=False)
    emoji      = Column(String(8),   nullable=False)
    created_at = Column(DateTime,    nullable=False, default=datetime.utcnow)

    post = relationship("VoicePost", back_populates="reactions")


# ── Report ────────────────────────────────────────────────────────────────
class Report(Base):
    __tablename__ = "reports"

    id          = Column(Integer,    primary_key=True, autoincrement=True)
    post_id     = Column(String(36), ForeignKey("voice_posts.id"), nullable=False)
    reporter_id = Column(String(36), ForeignKey("users.id"),       nullable=False)
    reason      = Column(String(128), nullable=False, default="other")
    created_at  = Column(DateTime,   nullable=False, default=datetime.utcnow)

    post = relationship("VoicePost", back_populates="reports")