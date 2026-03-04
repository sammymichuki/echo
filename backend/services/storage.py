"""
services/storage.py
-------------------
Thin wrapper around cloud object storage for audio files.
Defaults to AWS S3 via boto3.  Swap the implementation for GCS / R2 / MinIO
by replacing the body of `upload_audio`.

For local development, files are saved to UPLOAD_DIR and served statically.
"""

import os
import aiofiles

# ── Config ─────────────────────────────────────────────────────────────────
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")   # "local" | "s3"
UPLOAD_DIR      = os.getenv("UPLOAD_DIR",      "uploads")
S3_BUCKET       = os.getenv("S3_BUCKET",       "echo-audio")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL",  "http://localhost:8000/uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)


async def upload_audio(audio_bytes: bytes, filename: str) -> str:
    """
    Persist raw audio bytes and return a public URL.

    Parameters
    ----------
    audio_bytes : bytes
    filename    : str  – e.g. "abc123.webm"

    Returns
    -------
    str  – publicly accessible URL
    """
    if STORAGE_BACKEND == "s3":
        return await _upload_s3(audio_bytes, filename)
    return await _upload_local(audio_bytes, filename)


# ── Local storage (development) ────────────────────────────────────────────
async def _upload_local(audio_bytes: bytes, filename: str) -> str:
    path = os.path.join(UPLOAD_DIR, filename)
    async with aiofiles.open(path, "wb") as f:
        await f.write(audio_bytes)
    return f"{PUBLIC_BASE_URL}/{filename}"


# ── AWS S3 (production) ────────────────────────────────────────────────────
async def _upload_s3(audio_bytes: bytes, filename: str) -> str:
    import aioboto3  # pip install aioboto3
    session = aioboto3.Session()
    async with session.client("s3") as s3:
        await s3.put_object(
            Bucket=S3_BUCKET,
            Key=f"audio/{filename}",
            Body=audio_bytes,
            ContentType="audio/webm",
            ACL="public-read",
        )
    region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
    return f"https://{S3_BUCKET}.s3.{region}.amazonaws.com/audio/{filename}"