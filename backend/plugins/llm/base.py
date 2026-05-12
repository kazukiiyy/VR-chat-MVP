from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from collections.abc import Collection
from dataclasses import dataclass, field
from typing import Any


@dataclass
class LLMResponse:
    text: str
    emotion: str
    voice_style: str
    extra: dict[str, Any] = field(default_factory=dict)


class LLMPlugin(ABC):
    @abstractmethod
    async def generate(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        response_schema: dict[str, Any],
    ) -> LLMResponse:
        ...


def parse_llm_response(
    raw_text: str,
    valid_emotions: Collection[str] | None = None,
    valid_voice_styles: Collection[str] | None = None,
) -> LLMResponse:
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw_text, flags=re.DOTALL)
        if not match:
            return LLMResponse(
                text=raw_text.strip(),
                emotion="neutral",
                voice_style="normal",
                extra={},
            )
        try:
            payload = json.loads(match.group(0))
        except json.JSONDecodeError:
            return LLMResponse(
                text=raw_text.strip(),
                emotion="neutral",
                voice_style="normal",
                extra={},
            )

    if not isinstance(payload, dict):
        return LLMResponse(
            text=raw_text.strip(),
            emotion="neutral",
            voice_style="normal",
            extra={},
        )

    text = str(payload.get("text") or raw_text).strip()
    emotion = str(payload.get("emotion") or "neutral")
    voice_style = str(payload.get("voice_style") or "normal")

    if valid_emotions is not None and emotion not in valid_emotions:
        emotion = "neutral"
    if valid_voice_styles is not None and voice_style not in valid_voice_styles:
        voice_style = "normal"

    extra = {key: value for key, value in payload.items() if key not in {"text", "emotion", "voice_style"}}
    return LLMResponse(text=text, emotion=emotion, voice_style=voice_style, extra=extra)


def schema_instruction(response_schema: dict[str, Any]) -> str:
    return (
        "Return only valid JSON matching this schema. "
        f"Do not include Markdown or explanations: {json.dumps(response_schema, ensure_ascii=False)}"
    )
