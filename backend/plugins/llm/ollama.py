from __future__ import annotations

from typing import Any

import httpx

from backend.plugins.llm.base import LLMPlugin, LLMResponse, parse_llm_response, schema_instruction


class OllamaPlugin(LLMPlugin):
    def __init__(self, endpoint: str, model: str, timeout_sec: float = 120.0) -> None:
        self.endpoint = endpoint.rstrip("/")
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
                    f"{self.endpoint}/api/chat",
                    json={
                        "model": self.model,
                        "stream": False,
                        "messages": [
                            {
                                "role": "system",
                                "content": f"{system_prompt}\n\n{schema_instruction(response_schema)}",
                            },
                            *messages,
                        ],
                    },
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise RuntimeError(f"Ollama API request failed: {exc}") from exc

        payload = response.json()
        raw_text = payload.get("message", {}).get("content", "")
        return parse_llm_response(raw_text)
