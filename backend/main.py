from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from backend.config.settings import Settings, load_settings
from backend.core.pipeline import Pipeline
from backend.plugins.llm.base import LLMPlugin
from backend.plugins.llm.claude import ClaudePlugin
from backend.plugins.llm.ollama import OllamaPlugin
from backend.plugins.llm.openai import OpenAIPlugin
from backend.plugins.tts.base import TTSPlugin
from backend.plugins.tts.elevenlabs import ElevenLabsPlugin
from backend.plugins.tts.stylebertvits2 import StyleBertVITS2Plugin
from backend.plugins.tts.voicevox import VoicevoxPlugin


def _create_llm(settings: Settings) -> LLMPlugin:
    active = settings.app.llm.active
    provider = settings.app.llm.providers.get(active, {})
    if active == "claude":
        return ClaudePlugin(
            api_key=str(provider.get("api_key", "")),
            model=str(provider.get("model", "claude-opus-4-6")),
        )
    if active == "openai":
        return OpenAIPlugin(
            api_key=str(provider.get("api_key", "")),
            model=str(provider.get("model", "gpt-4o")),
        )
    if active == "ollama":
        return OllamaPlugin(
            endpoint=str(provider.get("endpoint", "http://localhost:11434")),
            model=str(provider.get("model", "llama3")),
        )
    raise ValueError(f"Unsupported LLM provider: {active}")


def _create_tts(settings: Settings) -> TTSPlugin:
    active = settings.app.tts.active
    provider = settings.app.tts.providers.get(active, {})
    if active == "voicevox":
        return VoicevoxPlugin(endpoint=str(provider.get("endpoint", "http://localhost:50021")))
    if active == "stylebertvits2":
        return StyleBertVITS2Plugin(endpoint=str(provider.get("endpoint", "http://localhost:5000")))
    if active == "elevenlabs":
        return ElevenLabsPlugin(
            api_key=str(provider.get("api_key", "")),
            voice_id=str(provider.get("voice_id", "21m00Tcm4TlvDq8ikWAM")),
        )
    raise ValueError(f"Unsupported TTS provider: {active}")


settings = load_settings()
pipeline = Pipeline(
    app_settings=settings.app,
    llm=_create_llm(settings),
    tts=_create_tts(settings),
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await pipeline.stop()


app = FastAPI(title="VTuber Live Backend", lifespan=lifespan)


@app.get("/status")
async def status() -> dict[str, Any]:
    return pipeline.status()


@app.post("/start")
async def start() -> dict[str, Any]:
    await pipeline.start()
    return pipeline.status()


@app.post("/stop")
async def stop() -> dict[str, Any]:
    await pipeline.stop()
    return pipeline.status()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    pipeline.add_websocket(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pipeline.remove_websocket(websocket)


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
