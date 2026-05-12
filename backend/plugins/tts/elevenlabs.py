from __future__ import annotations

from typing import Any

import httpx

from backend.plugins.tts.base import TTSPlugin
from backend.plugins.tts.voicevox import _silent_wav


class ElevenLabsPlugin(TTSPlugin):
    def __init__(self, api_key: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM", timeout_sec: float = 60.0) -> None:
        self.api_key = api_key
        self.voice_id = voice_id
        self.timeout_sec = timeout_sec

    async def synthesize(self, text: str, style_params: dict[str, Any]) -> bytes:
        if not self.api_key:
            return _silent_wav()

        try:
            async with httpx.AsyncClient(timeout=self.timeout_sec) as client:
                response = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}",
                    headers={
                        "xi-api-key": self.api_key,
                        "accept": "audio/wav",
                        "content-type": "application/json",
                    },
                    json={
                        "text": text,
                        "model_id": style_params.get("model_id", "eleven_multilingual_v2"),
                        "voice_settings": {
                            "stability": style_params.get("stability", 0.5),
                            "similarity_boost": style_params.get("similarity_boost", 0.75),
                        },
                    },
                )
                response.raise_for_status()
                return response.content
        except httpx.HTTPError:
            return _silent_wav()
