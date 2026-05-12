from __future__ import annotations

from typing import Any

import httpx

from backend.plugins.tts.base import TTSPlugin
from backend.plugins.tts.voicevox import _silent_wav


class StyleBertVITS2Plugin(TTSPlugin):
    def __init__(self, endpoint: str, timeout_sec: float = 60.0) -> None:
        self.endpoint = endpoint.rstrip("/")
        self.timeout_sec = timeout_sec

    async def synthesize(self, text: str, style_params: dict[str, Any]) -> bytes:
        try:
            async with httpx.AsyncClient(timeout=self.timeout_sec) as client:
                response = await client.post(
                    f"{self.endpoint}/voice",
                    params={
                        "text": text,
                        "speaker_id": style_params.get("speaker_id", 0),
                        "sdp_ratio": style_params.get("sdp_ratio", 0.2),
                        "noise": style_params.get("noise", 0.6),
                        "noisew": style_params.get("noisew", 0.8),
                        "length": style_params.get("speed", 1.0),
                    },
                )
                response.raise_for_status()
                return response.content
        except httpx.HTTPError:
            return _silent_wav()
