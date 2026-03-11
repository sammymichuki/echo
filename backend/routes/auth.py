"""
routes/auth.py
--------------
POST /auth/register  – create a persistent anonymous account
POST /auth/session   – restore a saved session token
POST /auth/recover   – restore the account on another device using recovery code
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.schemas.schemas import AuthSessionOut, RecoveryIn, SessionIn
from backend.services.auth import (
    create_anonymous_account,
    create_session,
    get_user_by_recovery_code,
    get_user_by_session_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthSessionOut)
async def register_anonymous_account(db: AsyncSession = Depends(get_db)):
    user, auth_token, recovery_code = await create_anonymous_account(db)
    return {
        "anon_id": user.id,
        "auth_token": auth_token,
        "recovery_code": recovery_code,
    }


@router.post("/session", response_model=AuthSessionOut)
async def restore_session(body: SessionIn, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_session_token(db, body.token)
    return {
        "anon_id": user.id,
        "auth_token": body.token,
        "recovery_code": None,
    }


@router.post("/recover", response_model=AuthSessionOut)
async def recover_account(body: RecoveryIn, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_recovery_code(db, body.recovery_code)
    auth_token = await create_session(db, user.id)
    return {
        "anon_id": user.id,
        "auth_token": auth_token,
        "recovery_code": body.recovery_code.strip().upper(),
    }
