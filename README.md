# vtuber-live

## 1. プロジェクト概要

YouTubeライブ配信向けのAI VTuberシステムです。

YouTubeライブのコメントを自動で読み取り、LLMが返答を生成し、TTSで音声合成します。生成された音声と感情情報をフロントエンドへ送信し、Live2Dアバターの表情・口パク制御とコメント表示を行います。

対象は1人運用のYouTubeライブ配信のみです。

## 2. アーキテクチャ

### 構成図

```text
┌─────────────────────────────────────────────┐
│              Electron App (Frontend)         │
│  ┌──────────────┐  ┌──────────────────────┐ │
│  │ Live2DCanvas │  │   CommentOverlay     │ │
│  │ (感情・口パク)│  │   (コメント表示)     │ │
│  └──────────────┘  └──────────────────────┘ │
│         ↕ WebSocket (ws://localhost:8000/ws) │
└─────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────┐
│              FastAPI Backend                 │
│                                             │
│  YouTube API ──→ CommentQueue               │
│                      ↓                      │
│                  LLM Plugin                 │
│          (Claude / OpenAI / Ollama)         │
│                      ↓                      │
│                  TTS Plugin                 │
│      (VOICEVOX / Style-Bert-VITS2 /         │
│       ElevenLabs)                           │
│                      ↓                      │
│              WebSocket broadcast            │
└─────────────────────────────────────────────┘
```

### データフロー

1. YouTubeライブのコメントをポーリング取得
2. CommentQueueに積む
3. LLMプラグインがコメントに返答を生成（JSON形式: text / emotion / voice_style）
4. TTSプラグインが音声合成（WAVバイナリ）
5. WebSocketでフロントエンドに送信
6. フロントエンドが音声再生・Live2Dの感情/口パク制御・コメント表示

## 3. ディレクトリ構成

```text
vtuber-live/
├── backend/
│   ├── main.py                  # FastAPI + WebSocket サーバー
│   ├── core/
│   │   ├── pipeline.py          # メインパイプライン
│   │   ├── comment_queue.py     # コメントキュー
│   │   └── context_manager.py  # 会話履歴管理
│   ├── plugins/
│   │   ├── llm/                 # LLMプラグイン (claude / openai / ollama)
│   │   └── tts/                 # TTSプラグイン (voicevox / stylebertvits2 / elevenlabs)
│   └── config/
│       └── settings.py          # 設定ファイル読み込み (Pydantic)
├── frontend/
│   ├── electron/
│   │   └── main.ts              # Electronメインプロセス
│   └── src/
│       ├── pages/               # LiveView / SettingsView
│       ├── components/          # Live2DCanvas / CommentOverlay / AudioPlayer
│       └── lib/
│           └── websocket.ts     # WebSocketクライアント
└── config/
    ├── app.json                 # LLM・TTS・YouTube設定
    └── avatar.json              # Live2D感情・口パク設定
```

## 4. 設定ファイル

### config/app.json

- `llm.active`: 使用するLLMプロバイダー（`claude` / `openai` / `ollama`）
- `llm.system_prompt`: キャラクターのシステムプロンプト（自由記述）
- `llm.response_schema`: LLMに返させるJSONのスキーマ定義
- `llm.providers`: 各プロバイダーのAPIキー・モデル設定
- `tts.active`: 使用するTTSエンジン（`voicevox` / `stylebertvits2` / `elevenlabs`）
- `tts.styles`: 感情ごとの音声パラメータ（speed / pitch / volume など）

### config/avatar.json

- `model_path`: Live2Dモデルファイルのパス
- `emotions`: 感情名から表情ファイル・モーション・パラメータへのマッピング
- `lipsync`: 口パクパラメータ名・gain・smoothing

## 5. セットアップと起動

### 前提条件

- Python 3.11+
- Node.js 20+
- 使用するTTSエンジン（VOICEVOX等）を別途起動しておく

### 一括起動（推奨）

プロジェクトルートで以下を実行するだけで、バックエンド・Vite・Electronがすべて起動します。

```bash
./start.sh
```

Ctrl+C で全プロセスを一括停止できます。

### 個別起動

```bash
# ターミナル1: バックエンド
uvicorn backend.main:app --host 0.0.0.0 --port 8000

# ターミナル2: Vite dev server
cd frontend && npm run dev

# ターミナル3: Electron（Vite起動後に実行）
cd frontend && npm run electron:dev
```

### 依存パッケージのインストール

初回のみ実行してください。

```bash
pip install -r requirements.txt
cd frontend && npm install
```

## 6. LLM / TTS の切り替え方法

`config/app.json` の `llm.active` と `tts.active` を変更するだけで、使用するLLMプロバイダーとTTSエンジンを切り替えられます。

コードの変更は不要です。

## 7. Live2Dモデルの組み込み方法

1. `models/` フォルダにモデルを配置
2. `config/avatar.json` の `model_path` を更新
3. `config/avatar.json` の `emotions` に感情ごとのexpression・motionを定義
4. `frontend/src/components/Live2DCanvas.tsx` の `applyLive2DParameters` 関数内のコメントに従ってSDKを接続

## 8. WebSocket メッセージ仕様

### フロントエンドが受け取るメッセージ

```json
{
  "type": "response",
  "comment": { "author": "視聴者名", "text": "コメント内容" },
  "reply": "AIの返答テキスト",
  "emotion": "happy",
  "voice_style": "excited",
  "audio": "<base64エンコードのWAVデータ>"
}
```

### REST API

- `GET /status` — パイプラインの稼働状態
- `POST /start` — パイプライン開始（設定を再読み込みして再構築）
- `POST /stop` — パイプライン停止
- `POST /comment` — コメントを手動注入（テスト用）
- `GET /voicevox/speakers` — VOICEVOX話者一覧取得
- `WS /ws` — WebSocketエンドポイント

## 9. テスト

### 手動コメント注入

`./start.sh` 起動後、▶ ボタンでパイプラインを開始してから実行します。

```bash
python3 comment.py "こんにちは！"
python3 comment.py "田中太郎" "お久しぶり！2ヶ月ぶりですね"
```

### 単体テスト

```bash
# VOICEVOX テスト（VOICEVOXアプリ起動中に実行）
/usr/bin/python3 tests/test_voicevox.py

# LLM テスト（バックエンド不要、.env のAPIキーのみ必要）
/usr/bin/python3 tests/test_llm.py

# パイプライン統合テスト（start.sh 起動中 + ▶ を押した後に実行）
/usr/bin/python3 tests/test_pipeline.py
```
