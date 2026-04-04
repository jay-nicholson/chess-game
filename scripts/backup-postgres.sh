#!/usr/bin/env bash
# Backup Postgres from the docker-compose service named "postgres".
# Usage: POSTGRES_USER=chess POSTGRES_DB=chess ./scripts/backup-postgres.sh [output-dir]
set -euo pipefail

OUT_DIR="${1:-./backups}"
USER="${POSTGRES_USER:-chess}"
DB="${POSTGRES_DB:-chess}"
COMPOSE="${COMPOSE:-docker compose}"

mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/chess-$(date +%Y%m%d-%H%M%S).sql.gz"

$COMPOSE exec -T postgres pg_dump -U "$USER" "$DB" | gzip -9 >"$FILE"
echo "Wrote $FILE"
