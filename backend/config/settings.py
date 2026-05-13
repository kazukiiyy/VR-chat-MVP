from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from pydantic import BaseModel, Field


ROOT_DIR = Path(__file__).resolve().parents[2]


class YouTubeSettings(BaseModel):
    api_key: str = ""
    stream_id: str = ""
    polling_interval_sec: float = 5.0


class LLMSettings(BaseModel):
    active: str = "claude"
    system_prompt: str
    response_schema: dict[str, Any]
    providers: dict[str, dict[str, Any]]


class TTSSettings(BaseModel):
    active: str = "voicevox"
    providers: dict[str, dict[str, Any]]
    styles: dict[str, dict[str, Any]]


class AppSettings(BaseModel):
    youtube: YouTubeSettings
    llm: LLMSettings
    tts: TTSSettings


class EmotionSettings(BaseModel):
    expression: str
    motion_group: str
    motion_index: int
    params: dict[str, float] = Field(default_factory=dict)


class LipsyncSettings(BaseModel):
    param: str
    gain: float
    smoothing: float


class IdleMotionSettings(BaseModel):
    group: str
    index: int
    interval_sec: float


class AvatarSettings(BaseModel):
    model_path: str
    emotions: dict[str, EmotionSettings]
    lipsync: LipsyncSettings
    idle_motion: IdleMotionSettings


class Settings(BaseModel):
    app: AppSettings
    avatar: AvatarSettings


def load_settings(
    app_path: Path | None = None,
    avatar_path: Path | None = None,
) -> Settings:
    load_dotenv(ROOT_DIR / ".env", override=True)
    app_file = app_path or ROOT_DIR / "config" / "app.json"
    avatar_file = avatar_path or ROOT_DIR / "config" / "avatar.json"
    app = AppSettings(**_read_json(app_file))
    _apply_env_overrides(app)

    return Settings(
        app=app,
        avatar=AvatarSettings(**_read_json(avatar_file)),
    )


def _apply_env_overrides(app: AppSettings) -> None:
    if os.getenv("CLAUDE_API_KEY"):
        app.llm.providers.setdefault("claude", {})["api_key"] = os.environ["CLAUDE_API_KEY"]
    if os.getenv("OPENAI_API_KEY"):
        app.llm.providers.setdefault("openai", {})["api_key"] = os.environ["OPENAI_API_KEY"]
    if os.getenv("ELEVENLABS_API_KEY"):
        app.tts.providers.setdefault("elevenlabs", {})["api_key"] = os.environ["ELEVENLABS_API_KEY"]
    if os.getenv("YOUTUBE_API_KEY"):
        app.youtube.api_key = os.environ["YOUTUBE_API_KEY"]


def _read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data
