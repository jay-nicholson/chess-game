#!/usr/bin/env bash
# Start the Docker Compose stack and open a tmux session with one pane per service log stream.
#
# Env: uses `.env` in the repo root if it exists; otherwise `docker/dev.env` (local dev defaults).
#
# Usage:
#   ./scripts/tmux-docker.sh              # start stack, create session (detached), print attach hint
#   ./scripts/tmux-docker.sh --attach     # same, then attach immediately
#   ./scripts/tmux-docker.sh --no-up      # do not run `docker compose up -d` (logs only)
#   ./scripts/tmux-docker.sh --fresh-logs # remove stale chess-game session, then new log panes (after rebuild)
#
# One-liner (dev):  ./scripts/tmux-docker.sh --attach
#
# Attach later (use env -u TMUX if you are already in tmux):
#   env -u TMUX tmux attach -t chess-game
#
# Detach without stopping containers: Ctrl-b then d
# Kill session: tmux kill-session -t chess-game
#
# Session name override:
#   CHESS_TMUX_SESSION=my-chess ./scripts/tmux-docker.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SESSION="${CHESS_TMUX_SESSION:-chess-game}"
DO_UP=1
ATTACH=0
FRESH_LOGS=0

for arg in "$@"; do
  case "$arg" in
    --attach | -a) ATTACH=1 ;;
    --no-up) DO_UP=0 ;;
    --fresh-logs) FRESH_LOGS=1 ;;
    -h | --help)
      sed -n '1,30p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is not installed. On macOS: brew install tmux" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running." >&2
  exit 1
fi

if [[ -f "$ROOT/.env" ]]; then
  ENV_FILE=".env"
else
  ENV_FILE="docker/dev.env"
  echo "Using dev defaults: $ROOT/$ENV_FILE (create .env to override)"
fi

COMPOSE=(docker compose --env-file "$ROOT/$ENV_FILE")

if [[ "$DO_UP" -eq 1 ]]; then
  echo "Starting stack (${COMPOSE[*]} up -d)..."
  "${COMPOSE[@]}" up -d
fi

if tmux has-session -t "$SESSION" 2>/dev/null; then
  if [[ "$FRESH_LOGS" -eq 1 ]]; then
    echo "Replacing stale tmux session '$SESSION' (--fresh-logs)..."
    tmux kill-session -t "$SESSION"
  else
    echo "tmux session '$SESSION' already exists. Kill it first: tmux kill-session -t $SESSION" >&2
    echo "Or rerun with: ./scripts/tmux-docker.sh --fresh-logs" >&2
    exit 1
  fi
fi

# Three columns: postgres | game-server | web (each pane tails that container's logs)
tmux new-session -d -s "$SESSION" -c "$ROOT" -n logs
tmux send-keys -t "$SESSION:logs.0" "docker compose --env-file $ENV_FILE logs -f postgres" C-m
tmux split-window -h -c "$ROOT" -t "$SESSION:logs.0"
tmux send-keys -t "$SESSION:logs.1" "docker compose --env-file $ENV_FILE logs -f game-server" C-m
tmux split-window -h -c "$ROOT" -t "$SESSION:logs.1"
tmux send-keys -t "$SESSION:logs.2" "docker compose --env-file $ENV_FILE logs -f web" C-m
tmux select-layout -t "$SESSION:logs" even-horizontal

echo ""
echo "tmux session '$SESSION' is running with three panes (postgres | game-server | web)."
echo "  Attach:  env -u TMUX tmux attach -t $SESSION   (needed if you are already inside tmux)"
echo "  Detach:  Ctrl-b then d"
echo ""

if [[ "$ATTACH" -eq 1 ]]; then
  # Clear TMUX so attach works from another tmux session or tools that set $TMUX.
  exec env -u TMUX tmux attach -t "$SESSION"
fi
