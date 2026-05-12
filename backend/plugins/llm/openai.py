from __future__ import annotations

from typing import Any

import httpx

from backend.plugins.llm.base import LLMPlugin, LLMResponse, parse_llm_response, schema_instruction


class OpenAIPlugin(LLMPlugin):
    def __init__(self, api_key: str, model: str, timeout_sec: float = 60.0) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout_sec = timeout_sec

    async def generate(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        response_schema: dict[str, Any],
    ) -> LLMResponse:
        if not self.api_key:
            latest = messages[-1]["content"] if messages else ""
            return LLMResponse(
                text=f"コメントありがとう！「{latest}」っていい話題だね。",
                emotion="happy",
                voice_style="normal",
                extra={"mock": True},
            )

        try:
            async with httpx.AsyncClient(timeout=self.timeout_sec) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "authorization": f"Bearer {self.api_key}",
                        "content-type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": f"{system_prompt}\n\n{schema_instruction(response_schema)}",
                            },
                            *messages,
                        ],
                        "response_format": {"type": "json_object"},
                    },
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise RuntimeError(f"OpenAI API request failed: {exc}") from exc

        payload = response.json()
        raw_text = payload["choices"][0]["message"]["content"]
        return parse_llm_response(raw_text)
