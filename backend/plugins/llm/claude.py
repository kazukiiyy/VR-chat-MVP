from __future__ import annotations

from typing import Any

import httpx

from backend.plugins.llm.base import LLMPlugin, LLMResponse, parse_llm_response, schema_instruction


class ClaudePlugin(LLMPlugin):
    def __init__(self, api_key: str, model: str, timeout_sec: float = 60.0) -> None:
        if not api_key:
            raise ValueError("CLAUDE_API_KEY is not set. Add it to your .env file.")
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
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "max_tokens": 512,
                        "system": f"{system_prompt}\n\n{schema_instruction(response_schema)}",
                        "messages": messages,
                    },
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise RuntimeError(f"Claude API request failed: {exc}") from exc

        payload = response.json()
        parts = payload.get("content", [])
        raw_text = "".join(part.get("text", "") for part in parts if part.get("type") == "text")
        return parse_llm_response(raw_text)
