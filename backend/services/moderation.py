"""
services/moderation.py
----------------------
Voice moderation pipeline:
  1. Speech-to-text  (OpenAI Whisper API or local whisper model)
  2. Toxicity check  (simple keyword list in dev; Perspective API in prod)

Returns (flagged: bool, transcript: str | None)
"""

import os
import re
from typing import Tuple, Optional

# ── Config ─────────────────────────────────────────────────────────────────
MODERATION_BACKEND = os.getenv("MODERATION_BACKEND", "simple")   # "simple" | "openai"
OPENAI_API_KEY     = os.getenv("OPENAI_API_KEY",     "")

# Basic blocklist – extend or replace with Perspective API in production
_BLOCKED_PATTERNS = re.compile(
    r"\b(kill|harm|abuse|slur_example|hate)\b",
    re.IGNORECASE,
)


async def moderate_audio(audio_bytes: bytes) -> Tuple[bool, Optional[str]]:
    """
    Run the full moderation pipeline on raw audio bytes.

    Returns
    -------
    (flagged, transcript)
    """
    transcript = await _transcribe(audio_bytes)
    if transcript is None:
        return False, None

    flagged = _is_toxic(transcript)
    return flagged, transcript


# ── Speech-to-text ─────────────────────────────────────────────────────────
async def _transcribe(audio_bytes: bytes) -> Optional[str]:
    if MODERATION_BACKEND == "openai" and OPENAI_API_KEY:
        return await _whisper_transcribe(audio_bytes)
    # Dev mode: skip transcription
    return None


async def _whisper_transcribe(audio_bytes: bytes) -> Optional[str]:
    """Call OpenAI Whisper API."""
    import httpx, io
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            files={"file": ("audio.webm", io.BytesIO(audio_bytes), "audio/webm")},
            data={"model": "whisper-1"},
            timeout=30,
        )
        if resp.status_code == 200:
            return resp.json().get("text")
    return None


# ── Toxicity classification ────────────────────────────────────────────────
def _is_toxic(text: str) -> bool:
    """
    Simple regex blocklist for dev.
    Replace with Perspective API call for production:
    https://developers.perspectiveapi.com/
    """
    return bool(_BLOCKED_PATTERNS.search(text))