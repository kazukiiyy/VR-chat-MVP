#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Ctrl+C 等で終了したとき子プロセスを全て終了
cleanup() {
  echo "Shutting down..."
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# バックエンド起動
echo "[1/3] Starting backend..."
cd "$ROOT_DIR"
uvicorn backend.main:app --host 0.0.0.0 --port 8000 &

# Vite dev server起動
echo "[2/3] Starting Vite..."
cd "$ROOT_DIR/frontend"
npm run dev &

# Viteの起動を待つ
echo "Waiting for Vite..."
until curl -s http://127.0.0.1:5173 > /dev/null 2>&1; do
  sleep 1
done

# Electron起動（フォアグラウンド）
echo "[3/3] Starting Electron..."
cd "$ROOT_DIR/frontend"
npx tsc -p tsconfig.electron.json && VITE_DEV_SERVER_URL=http://127.0.0.1:5173 npx electron .
