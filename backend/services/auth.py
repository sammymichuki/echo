import hashlib
import secrets
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.models import AnonymousCredential, AnonymousSession, User


def hash_secret(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def generate_recovery_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    chunks = [
        "".join(secrets.choice(alphabet) for _ in range(4))
        for _ in range(4)
    ]
    return "-".join(chunks)


async def generate_anon_id(db: AsyncSession) -> str:
    while True:
        anon_id = "anon_" + secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:10]
        result = await db.execute(select(User.id).where(User.id == anon_id))
        if not result.scalar_one_or_none():
            return anon_id


async def create_session(db: AsyncSession, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    db.add(
        AnonymousSession(
            user_id=user_id,
            token_hash=hash_secret(token),
        )
    )
    await db.flush()
    return token


async def create_anonymous_account(db: AsyncSession) -> tuple[User, str, str]:
    anon_id = await generate_anon_id(db)
    recovery_code = generate_recovery_code()
    user = User(id=anon_id)
    db.add(user)
    db.add(
        AnonymousCredential(
            user_id=anon_id,
            recovery_code_hash=hash_secret(recovery_code),
        )
    )
    await db.flush()
    auth_token = await create_session(db, anon_id)
    return user, auth_token, recovery_code


async def get_user_by_session_token(db: AsyncSession, token: str) -> User:
    hashed = hash_secret(token)
    result = await db.execute(
        select(AnonymousSession).where(AnonymousSession.token_hash == hashed)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    session.last_used_at = datetime.utcnow()

    user_result = await db.execute(select(User).where(User.id == session.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")
    return user


async def get_user_by_recovery_code(db: AsyncSession, recovery_code: str) -> User:
    hashed = hash_secret(recovery_code.strip().upper())
    result = await db.execute(
        select(AnonymousCredential).where(AnonymousCredential.recovery_code_hash == hashed)
    )
    credential = result.scalar_one_or_none()
    if not credential:
        raise HTTPException(status_code=404, detail="Recovery code not found")

    user_result = await db.execute(select(User).where(User.id == credential.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Recovery code not found")
    return user


async def require_existing_user(db: AsyncSession, anon_id: str) -> User:
    result = await db.execute(select(User).where(User.id == anon_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Anonymous account required")
    return user
