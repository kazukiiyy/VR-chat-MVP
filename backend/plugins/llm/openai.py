from __future__ import annotations

from typing import Any

import httpx

from backend.plugins.llm.base import LLMPlugin, LLMResponse, parse_llm_response, schema_instruction


class OpenAIPlugin(LLMPlugin):
    def __init__(self, api_key: str, model: str, timeout_sec: float = 60.0) -> None:
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not set. Add it to your .env file.")
        self.api_key = api_key
        self.model = model
        self.timeout_sec = timeout_sec

    async def generate(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
        response_schema: dict[str, Any],
    ) -> LLMResponse:
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
        choices = payload.get("choices")
        if not choices or not isinstance(choices, list):
            raise RuntimeError(f"Unexpected OpenAI response: {payload}")
        raw_text = choices[0].get("message", {}).get("content", "")
        if not raw_text:
            raise RuntimeError(f"Empty content in OpenAI response: {payload}")
        return parse_llm_response(raw_text)
