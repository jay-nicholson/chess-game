# Deploy on a homeserver (Docker + optional Cloudflare Tunnel)

This stack runs **three containers**: **Postgres** (event store), **game-server** (Socket.IO), and **web** (Next.js standalone). The game server listens on **4001**; the UI on **3000**. By default Compose binds them to **loopback only** (`127.0.0.1`) so nothing is exposed on your LAN until you put a reverse proxy or tunnel in front.

## Prerequisites

- Docker Engine + Docker Compose v2
- A domain (optional until you publish publicly)
- Follow [homeserver-baseline.md](./homeserver-baseline.md) for host hardening

## 1. Configure environment

**Production / real domain:** copy and edit:

```bash
cp .env.production.example .env
```

**Local Docker dev only:** you can rely on the committed defaults in [`docker/dev.env`](docker/dev.env) (used automatically when `.env` is missing — e.g. `./scripts/tmux-docker.sh`). Do not use that file for production.

Set at minimum:

| Variable | Purpose |
|----------|---------|
| `POSTGRES_PASSWORD` | DB password (required by Compose) |
| `ALLOWED_ORIGINS` | Browser origins allowed by Socket.IO CORS (e.g. `https://chess.example.com`) |
| `NEXT_PUBLIC_WS_URL` | **Public** URL the browser uses to reach the game server (must match page protocol: `https` page → `wss` URL) |

Rebuild **web** whenever you change `NEXT_PUBLIC_WS_URL` (it is baked at build time).

## 2. Build and run

```bash
docker compose build --build-arg NEXT_PUBLIC_WS_URL="$NEXT_PUBLIC_WS_URL"
docker compose up -d
```

### After you change code (rebuild + fresh tmux logs)

Containers do **not** hot-reload your repo. Rebuild and recreate:

```bash
npm run docker:restart
```

That runs `docker compose up -d --build`, kills the old `chess-game` tmux session (which was tailing **previous** container IDs), and opens new log panes. Then attach: `env -u TMUX tmux attach -t chess-game`.

If you only use Compose without the helper: `up -d --build`, then `tmux kill-session -t chess-game` and `./scripts/tmux-docker.sh --no-up`, or `./scripts/tmux-docker.sh --fresh-logs` after a manual `up -d --build`.

Or set `NEXT_PUBLIC_WS_URL` in `.env` and use Compose `args` from `docker-compose.yml` (already wired).

- UI: `http://127.0.0.1:3000`
- Game server health: `http://127.0.0.1:4001/health`  
  Optional: set `GAME_SERVER_HEALTH_KEY` and send header `X-Game-Server-Health: <value>` for monitoring.

### LAN (no tunnel): phones and other PCs on the same network

The default Compose file binds **3000** and **4001** to **127.0.0.1 only**, so nothing on your LAN can connect. To expose the stack on all interfaces, use the LAN override and point the browser build at your server’s **LAN IP** (not `localhost`).

1. Pick the host’s address (example `192.168.1.10`).
2. Set **`ALLOWED_ORIGINS`** to the exact origins players will use, e.g. `http://192.168.1.10:3000` (comma-separate if you have more).
3. Rebuild **web** with **`NEXT_PUBLIC_WS_URL=http://192.168.1.10:4001`** (must be reachable from each client; same host/port the browser will use for Socket.IO).
4. Run:

```bash
docker compose -f docker-compose.yml -f docker-compose.lan.yml build --build-arg NEXT_PUBLIC_WS_URL=http://192.168.1.10:4001
docker compose -f docker-compose.yml -f docker-compose.lan.yml up -d
```

Open **`http://192.168.1.10:3000`** from other devices. Ensure the host firewall allows **3000** and **4001** if applicable.

For **local dev without Docker**, run `npm run dev` and `npm run dev:ws` on the server, set **`NEXT_PUBLIC_WS_URL`** in `.env.local` to `http://<LAN-IP>:4001`, and start the Next dev server with the host listening on `0.0.0.0` if needed (`next dev -H 0.0.0.0`). The game server must allow your page origin in **`ALLOWED_ORIGINS`**.

## 3. Optional: Cloudflare Tunnel in Compose

If you prefer the tunnel in the same Compose project (instead of installing `cloudflared` on the host):

1. Create a tunnel and token in the [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) dashboard.
2. In the tunnel’s **Public Hostname** routes, point UI traffic to `http://web:3000` and the Socket.IO origin to `http://game-server:4001` (service names on the Compose network).
3. Run:

```bash
export CLOUDFLARE_TUNNEL_TOKEN="eyJh..."
docker compose --profile tunnel up -d
```

The `tunnel` profile starts only the `cloudflared` service (see `docker-compose.yml`). The main stack (`postgres`, `game-server`, `web`) runs without this profile.

## 4. Publish HTTPS / WSS without opening router ports (recommended)

Use **Cloudflare Tunnel** (`cloudflared`) on the homeserver:

1. Create a tunnel in the Cloudflare dashboard and install `cloudflared` on the Mac.
2. Route your public hostname(s) to local services, for example:
   - `https://chess.example.com` → `http://127.0.0.1:3000`
   - `https://ws.example.com` → `http://127.0.0.1:4001` (Socket.IO + health)
3. Set `ALLOWED_ORIGINS=https://chess.example.com` and `NEXT_PUBLIC_WS_URL=https://ws.example.com`
4. Rebuild the **web** image so the client embeds the correct WS URL.

**Mixed content:** If the chess page is served over `https://`, the Socket.IO URL must be `https://` or `wss://` (not plain `http://` to another host). Using a dedicated `ws.` subdomain on HTTPS is fine; the client uses the URL you configure.

## 5. Admin route

If you set `ADMIN_SECRET` in the environment for the **web** container, `GET /admin` requires:

- `Authorization: Bearer <ADMIN_SECRET>`, or  
- Cookie `chess_admin=<ADMIN_SECRET>`

If `ADMIN_SECRET` is unset, `/admin` returns **404** (route not advertised).

Prefer **Tailscale SSH** or **Cloudflare Access** for operator access; this route is a minimal escape hatch.

## 6. Data

Postgres data lives in the Docker volume `pgdata` (see `docker-compose.yml`). Back up with [ops-homeserver.md](./ops-homeserver.md).

If you **change `POSTGRES_PASSWORD`** after the volume was created, Postgres will keep the old password until you reset the volume (e.g. `docker compose down -v` — **destroys DB data**) or change the password inside the running database.

## Tmux: one pane per service log

With the stack running via Compose, you can follow **Postgres**, **game-server**, and **web** in three side-by-side panes. If you do not have a root `.env`, dev defaults come from [`docker/dev.env`](../docker/dev.env).

```bash
./scripts/tmux-docker.sh --attach
```

Or: `npm run dev:docker-tmux` (same as the above).

- **Detach** (containers keep running): `Ctrl-b` then `d`
- **Already inside tmux?** Attach with `env -u TMUX tmux attach -t chess-game` (the script’s `--attach` does this for you).
- **End the tmux session** (stops the log panes, not the containers): `tmux kill-session -t chess-game`

### Debugging

Use this tmux session to **inspect live server behavior** (Socket.IO errors, DB issues, Next.js crashes) without guessing from the browser alone. The **center pane** is the **game-server**; that is the first place to look for join/move/protocol problems. If you are not in tmux, run `docker compose --env-file docker/dev.env logs -f game-server` (or the env file you use).

## Local dev without Docker

Continue using SQLite + `npm run dev` / `npm run dev:ws` as in the main README. Postgres is only required for the Compose stack (or when `DATABASE_URL` starts with `postgres`).
