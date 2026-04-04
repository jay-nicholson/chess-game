#!/usr/bin/env bash
# Rebuild images, recreate containers, and refresh tmux log panes (so you see new game-server / web output).
#
# Usage: ./scripts/docker-restart.sh
#
# Same as manually:
#   docker compose --env-file docker/dev.env up -d --build   # or .env if present
#   tmux kill-session -t chess-game 2>/dev/null || true
#   ./scripts/tmux-docker.sh --no-up
#   env -u TMUX tmux attach -t chess-game

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running." >&2
  exit 1
fi

if [[ -f "$ROOT/.env" ]]; then
  ENV_FILE=".env"
else
  ENV_FILE="docker/dev.env"
  echo "Using: $ROOT/$ENV_FILE"
fi

COMPOSE=(docker compose --env-file "$ROOT/$ENV_FILE")

echo "Building and restarting containers (${COMPOSE[*]} up -d --build)..."
"${COMPOSE[@]}" up -d --build

SESSION="${CHESS_TMUX_SESSION:-chess-game}"
if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Replacing tmux log session '$SESSION' (old panes were tailing previous containers)..."
  tmux kill-session -t "$SESSION"
fi

echo "Starting fresh log panes..."
bash "$ROOT/scripts/tmux-docker.sh" --no-up
echo ""
echo "Attach to logs: env -u TMUX tmux attach -t chess-game"
