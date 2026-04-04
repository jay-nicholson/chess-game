#!/usr/bin/env bash
# Quick smoke test when Docker Desktop / daemon is running.
# Usage: ./scripts/docker-smoke.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon not running. Start Docker Desktop (or the Docker service), then retry." >&2
  exit 1
fi

ENV_FILE="$(mktemp /tmp/chess-docker-smoke.XXXXXX.env)"
cleanup() { rm -f "$ENV_FILE"; }
trap cleanup EXIT

{
  echo "POSTGRES_PASSWORD=smoke_test_$(openssl rand -hex 8)"
  echo "NEXT_PUBLIC_WS_URL=http://127.0.0.1:4001"
} >"$ENV_FILE"

# Remove stale volumes so POSTGRES_PASSWORD always matches this run (random each smoke).
docker compose --env-file "$ENV_FILE" down -v 2>/dev/null || true

echo "Building images..."
docker compose --env-file "$ENV_FILE" build

echo "Starting stack..."
docker compose --env-file "$ENV_FILE" up -d

echo "Waiting for game-server /health..."
ok_gs=0
for _ in $(seq 1 45); do
  if curl -sf "http://127.0.0.1:4001/health" >/dev/null 2>&1; then
    ok_gs=1
    break
  fi
  sleep 2
done
if [[ "$ok_gs" -ne 1 ]]; then
  echo "Game server /health did not become ready in time." >&2
  docker compose --env-file "$ENV_FILE" logs --tail 80 game-server >&2 || true
  exit 1
fi

echo "Waiting for web / ..."
ok_web=0
for _ in $(seq 1 45); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000/" 2>/dev/null || echo "000")
  if [[ "$code" == "200" ]]; then
    ok_web=1
    break
  fi
  sleep 2
done
if [[ "$ok_web" -ne 1 ]]; then
  echo "Web / did not return HTTP 200 in time (last attempt)." >&2
  docker compose --env-file "$ENV_FILE" logs --tail 80 web >&2 || true
  exit 1
fi

echo "GET /health (game-server):"
curl -sf "http://127.0.0.1:4001/health" | head -c 200
echo ""

echo "GET / (web) status:"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://127.0.0.1:3000/"

echo "Stopping stack..."
docker compose --env-file "$ENV_FILE" down -v

echo "Smoke test done."
