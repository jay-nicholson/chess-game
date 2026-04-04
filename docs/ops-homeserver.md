# Operations: backups, logs, uptime

## Backups (Postgres in Docker)

Use the helper script (run on the host with the stack running):

```bash
chmod +x scripts/backup-postgres.sh
POSTGRES_USER=chess POSTGRES_DB=chess ./scripts/backup-postgres.sh ./backups
```

Or manually:

```bash
docker compose exec -T postgres pg_dump -U chess chess | gzip -9 > "./backups/chess-$(date +%Y%m%d-%H%M).sql.gz"
```

Store encrypted copies **off** the homeserver (another machine, object storage, or Time Machine).

### Restore (disaster drill)

1. Stop app containers: `docker compose stop web game-server`
2. Restore DB into a fresh volume or replace `pgdata` after careful planning.
3. Example restore:

```bash
gunzip -c ./backups/chess-YYYYMMDD.sql.gz | docker compose exec -T postgres psql -U chess -d chess
```

Test restores quarterly.

## Logs

- **Docker:** `docker compose logs -f web game-server`
- **Game server** emits JSON lines to stdout (structured logger).

Set log rotation via Docker / `log-driver` options if logs grow large.

## Uptime checks

Monitor:

1. **Next.js:** `GET https://chess.example.com/` (or local `http://127.0.0.1:3000/`)
2. **Game server:** `GET http://127.0.0.1:4001/health` (or public URL through tunnel)

If `GAME_SERVER_HEALTH_KEY` is set, send:

```http
GET /health
X-Game-Server-Health: <your-key>
```

Alert if non-200 or if TLS/WSS handshake fails from outside.

## Incident response (short)

1. **Compromise suspected:** rotate `POSTGRES_PASSWORD`, `ADMIN_SECRET`, `GAME_SERVER_HEALTH_KEY`, Cloudflare tunnel tokens, Tailscale keys as applicable.
2. **Restore:** use latest verified backup; redeploy images from known-good digests.
3. **Document:** what failed, time, fix — improves the next drill.

## Retention

- Keep **7–30 days** of daily DB dumps for a hobby deployment; longer if you care about game history replay.
