from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.config.settings import Settings, load_settings
from backend.core.pipeline import CommentSource, Pipeline
from backend.plugins.llm.base import LLMPlugin
from backend.plugins.llm.claude import ClaudePlugin
from backend.plugins.llm.ollama import OllamaPlugin
from backend.plugins.llm.openai import OpenAIPlugin
from backend.plugins.tts.base import TTSPlugin
from backend.plugins.tts.elevenlabs import ElevenLabsPlugin
from backend.plugins.tts.stylebertvits2 import StyleBertVITS2Plugin
from backend.plugins.tts.voicevox import VoicevoxPlugin
from backend.plugins.youtube.source import YouTubeCommentSource


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


def _create_comment_source(settings: Settings) -> CommentSource | None:
    youtube = settings.app.youtube
    if youtube.api_key and youtube.stream_id:
        return YouTubeCommentSource(
            api_key=youtube.api_key,
            video_id=youtube.stream_id,
            polling_interval_sec=youtube.polling_interval_sec,
        )
    return None


def _create_pipeline(settings: Settings) -> Pipeline:
    return Pipeline(
        app_settings=settings.app,
        llm=_create_llm(settings),
        tts=_create_tts(settings),
        comment_source=_create_comment_source(settings),
    )


settings = load_settings()
pipeline: Pipeline | None = None
_websockets: set = set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    if pipeline is not None:
        await pipeline.stop()


app = FastAPI(title="VTuber Live Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CommentRequest(BaseModel):
    author: str = "anonymous"
    text: str


@app.get("/status")
async def status() -> dict[str, Any]:
    if pipeline is None:
        return {"running": False, "queue_size": 0, "websocket_clients": 0}
    return pipeline.status()


@app.post("/comment")
async def comment(request: CommentRequest) -> dict[str, Any]:
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    if pipeline is None or not pipeline.running:
        raise HTTPException(status_code=400, detail="Pipeline is not running. Press ▶ first.")

    await pipeline.queue.put({"author": request.author, "text": request.text})
    return {"queued": True, "author": request.author, "text": request.text}


@app.get("/voicevox/speakers")
async def voicevox_speakers() -> list[Any]:
    provider = settings.app.tts.providers.get("voicevox", {})
    endpoint = str(provider.get("endpoint", "http://localhost:50021")).rstrip("/")

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{endpoint}/speakers")
            response.raise_for_status()
            data = response.json()
            return data if isinstance(data, list) else []
    except Exception:
        return []


@app.post("/start")
async def start() -> dict[str, Any]:
    global pipeline, settings

    if pipeline is not None:
        await pipeline.stop()

    settings = load_settings()
    try:
        pipeline = _create_pipeline(settings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    for websocket in _websockets:
        pipeline.add_websocket(websocket)

    await pipeline.start()
    return pipeline.status()


@app.post("/stop")
async def stop() -> dict[str, Any]:
    if pipeline is None:
        return {"running": False, "queue_size": 0, "websocket_clients": 0}
    await pipeline.stop()
    return pipeline.status()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    _websockets.add(websocket)
    if pipeline is not None:
        pipeline.add_websocket(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        _websockets.discard(websocket)
        if pipeline is not None:
            pipeline.remove_websocket(websocket)


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
