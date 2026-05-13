from __future__ import annotations

import io
import wave
from typing import Any

import httpx

from backend.plugins.tts.base import TTSPlugin


class VoicevoxPlugin(TTSPlugin):
    def __init__(self, endpoint: str, timeout_sec: float = 60.0) -> None:
        self.endpoint = endpoint.rstrip("/")
        self.timeout_sec = timeout_sec

    async def synthesize(self, text: str, style_params: dict[str, Any]) -> bytes:
        speaker_id = int(style_params.get("speaker_id", 3))
        try:
            async with httpx.AsyncClient(timeout=self.timeout_sec) as client:
                query_response = await client.post(
                    f"{self.endpoint}/audio_query",
                    params={"text": text, "speaker": speaker_id},
                )
                query_response.raise_for_status()
                query = query_response.json()
                query["speedScale"] = float(style_params.get("speed", 1.0))
                query["pitchScale"] = float(style_params.get("pitch", 0.0))
                query["volumeScale"] = float(style_params.get("volume", 1.0))
                query["intonationScale"] = float(style_params.get("intonation", 1.0))

                synthesis_response = await client.post(
                    f"{self.endpoint}/synthesis",
                    params={"speaker": speaker_id},
                    json=query,
                )
                synthesis_response.raise_for_status()
                return synthesis_response.content
        except httpx.HTTPError as exc:
            print(f"[voicevox] synthesis failed: {exc}")
            return _silent_wav()


def _silent_wav(duration_sec: float = 0.25, sample_rate: int = 24000) -> bytes:
    buffer = io.BytesIO()
    frame_count = int(duration_sec * sample_rate)
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(b"\x00\x00" * frame_count)
    return buffer.getvalue()
