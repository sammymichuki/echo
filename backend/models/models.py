"""
models/models.py
----------------
SQLAlchemy ORM table definitions, mirroring schema.sql exactly.
"""

from datetime import datetime, timedelta
import uuid

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey,
    Integer, SmallInteger, String, Text, UniqueConstraint,
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
    reposts = relationship("Repost", back_populates="user", cascade="all, delete-orphan")
    views   = relationship("PostView", back_populates="user", cascade="all, delete-orphan")
    shares  = relationship("PostShare", back_populates="user", cascade="all, delete-orphan")
    saves   = relationship("SavedPost", back_populates="user", cascade="all, delete-orphan")
    credential = relationship("AnonymousCredential", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sessions   = relationship("AnonymousSession", back_populates="user", cascade="all, delete-orphan")


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
    reposts   = relationship("Repost",      back_populates="post", cascade="all, delete-orphan")
    views     = relationship("PostView",    back_populates="post", cascade="all, delete-orphan")
    shares    = relationship("PostShare",   back_populates="post", cascade="all, delete-orphan")
    saves     = relationship("SavedPost",   back_populates="post", cascade="all, delete-orphan")
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


class Repost(Base):
    __tablename__ = "reposts"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_repost"),)

    id         = Column(Integer,     primary_key=True, autoincrement=True)
    post_id    = Column(String(36),  ForeignKey("voice_posts.id"), nullable=False)
    user_id    = Column(String(36),  ForeignKey("users.id"),       nullable=False)
    created_at = Column(DateTime,    nullable=False, default=datetime.utcnow)

    post = relationship("VoicePost", back_populates="reposts")
    user = relationship("User",      back_populates="reposts")


class PostView(Base):
    __tablename__ = "post_views"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_post_view"),)

    id         = Column(Integer,     primary_key=True, autoincrement=True)
    post_id    = Column(String(36),  ForeignKey("voice_posts.id"), nullable=False)
    user_id    = Column(String(36),  ForeignKey("users.id"),       nullable=False)
    created_at = Column(DateTime,    nullable=False, default=datetime.utcnow)

    post = relationship("VoicePost", back_populates="views")
    user = relationship("User",      back_populates="views")


class PostShare(Base):
    __tablename__ = "post_shares"

    id         = Column(Integer,     primary_key=True, autoincrement=True)
    post_id    = Column(String(36),  ForeignKey("voice_posts.id"), nullable=False)
    user_id    = Column(String(36),  ForeignKey("users.id"),       nullable=False)
    created_at = Column(DateTime,    nullable=False, default=datetime.utcnow)

    post = relationship("VoicePost", back_populates="shares")
    user = relationship("User",      back_populates="shares")


class SavedPost(Base):
    __tablename__ = "saved_posts"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_saved_post"),)

    id         = Column(Integer,     primary_key=True, autoincrement=True)
    post_id    = Column(String(36),  ForeignKey("voice_posts.id"), nullable=False)
    user_id    = Column(String(36),  ForeignKey("users.id"),       nullable=False)
    created_at = Column(DateTime,    nullable=False, default=datetime.utcnow)

    post = relationship("VoicePost", back_populates="saves")
    user = relationship("User",      back_populates="saves")


class AnonymousCredential(Base):
    __tablename__ = "anonymous_credentials"

    user_id             = Column(String(36), ForeignKey("users.id"), primary_key=True)
    recovery_code_hash  = Column(String(64), nullable=False, unique=True)
    created_at          = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="credential")


class AnonymousSession(Base):
    __tablename__ = "anonymous_sessions"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    user_id         = Column(String(36), ForeignKey("users.id"), nullable=False)
    token_hash      = Column(String(64), nullable=False, unique=True)
    created_at      = Column(DateTime, nullable=False, default=datetime.utcnow)
    last_used_at    = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")


# ── Report ────────────────────────────────────────────────────────────────
class Report(Base):
    __tablename__ = "reports"

    id          = Column(Integer,    primary_key=True, autoincrement=True)
    post_id     = Column(String(36), ForeignKey("voice_posts.id"), nullable=False)
    reporter_id = Column(String(36), ForeignKey("users.id"),       nullable=False)
    reason      = Column(String(128), nullable=False, default="other")
    created_at  = Column(DateTime,   nullable=False, default=datetime.utcnow)

    post = relationship("VoicePost", back_populates="reports")
