# Chess Game

A modern, interactive chess application built with React, Next.js, and TypeScript.

## Features

- ✨ **Interactive Gameplay**: Drag-and-drop or click-to-move pieces
- 🎯 **Move Validation**: Full chess rule enforcement with helpful error messages
- 👑 **Pawn Promotion**: Choose your promotion piece (Queen, Rook, Bishop, Knight)
- 📊 **Material Tracking**: Visual display of captured pieces with point tallies
- 🎨 **Move Highlighting**: See legal moves when selecting pieces
- ⚡ **Turn Enforcement**: Prevents selecting opponent pieces on their turn
- 🔄 **Game Status**: Real-time check, checkmate, and draw detection
- 📱 **Responsive Design**: Clean, modern UI that works on all devices

## Screenshots

[Add screenshots of your chess game here]

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/jay-nicholson/chess-game.git
cd chess-game
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to play!

### Online multiplayer (Next.js + WebSocket service)

This project now runs as two processes in development:

- Next.js app (UI)
- Socket.IO game server (authoritative game state + event store)

Start both in two terminals:

```bash
npm run dev
npm run dev:ws
```

Or run together:

```bash
npm run dev:all
```

Then open:

- Local game: [http://localhost:3000](http://localhost:3000)
- Online room: `http://localhost:3000/play/<roomId>`
- Spectator room: `http://localhost:3000/watch/<roomId>`

WebSocket server default URL: `http://localhost:4001`.

**Another device on Wi‑Fi:** `localhost` in the browser is always *that* device. To play from a phone or second PC, set `NEXT_PUBLIC_WS_URL` to your dev machine’s LAN IP and open the app with the same host—see [`docs/dev-lan-websocket.md`](docs/dev-lan-websocket.md).

### Environment variables

Create `.env.local` for Next.js and `.env` for the websocket service as needed.

- `NEXT_PUBLIC_WS_URL` - websocket origin, e.g. `http://localhost:4001` on the dev machine, or `http://<LAN-IP>:4001` when clients connect from other devices (see [docs/dev-lan-websocket.md](docs/dev-lan-websocket.md))
- `WS_PORT` - websocket server port (default `4001`)
- `DATABASE_URL` - sqlite path, e.g. `file:./game-server/data/chess.db`
- `ALLOWED_ORIGINS` - comma separated allowed origins for websocket CORS
- `RATE_LIMIT_PER_MINUTE` - per-socket move attempt limit
- `FIDGET_RATE_LIMIT_PER_MINUTE` - per-socket same-square fidget/snark limit
- `SPECTATOR_CAP_PER_ROOM` - cap for watchers per room
- `GAME_SERVER_HEALTH_KEY` - optional; if set, `GET /health` requires header `X-Game-Server-Health`
- `ADMIN_SECRET` - optional; if set, `/admin` requires `Authorization: Bearer …` or cookie `chess_admin` (see [`src/middleware.ts`](src/middleware.ts))
- `DATABASE_URL` - `file:…` for SQLite (default) or `postgres://…` for Postgres (e.g. Docker Compose)
- `REDIS_URL` - optional redis for multi-node fanout

### Homeserver (Docker Compose + Postgres)

For a **hardened single-machine** deployment (loopback binds + optional Cloudflare Tunnel):

1. Baseline host steps: [`docs/homeserver-baseline.md`](docs/homeserver-baseline.md)
2. Copy [`.env.production.example`](.env.production.example) to `.env` and set secrets + `NEXT_PUBLIC_WS_URL`
3. `docker compose build && docker compose up -d`  
   After **code changes**, rebuild containers and refresh log panes: `npm run docker:restart` (or `docker compose --env-file docker/dev.env up -d --build`, then `tmux kill-session -t chess-game` and `./scripts/tmux-docker.sh --no-up`).  
   Optional smoke test: `npm run docker:smoke`  
   Optional **tmux** (three panes, dev defaults in [`docker/dev.env`](docker/dev.env) if `.env` is missing): `npm run dev:docker-tmux` or `./scripts/tmux-docker.sh --attach` — see [docs/deploy-homeserver.md](docs/deploy-homeserver.md). **Debug:** attach to `chess-game` to watch **postgres | game-server | web** logs live (game-server pane for Socket.IO issues).
4. Full guide: [`docs/deploy-homeserver.md`](docs/deploy-homeserver.md) (includes optional **Cloudflare Tunnel** Compose profile)  
5. Backups / uptime: [`docs/ops-homeserver.md`](docs/ops-homeserver.md)

## How to Play

1. **Select and Move**: Click on a piece to select it, then click on a destination square
2. **Drag and Drop**: Alternatively, drag pieces directly to their destination
3. **Legal Moves**: Yellow highlights show all legal moves for the selected piece
4. **Turn-Based**: Only pieces of the current player can be selected
5. **Pawn Promotion**: When a pawn reaches the end, choose which piece to promote to
6. **Material Advantage**: Track captured pieces and point advantages in real-time

## Technology Stack

- **Frontend**: React 19, Next.js 15
- **Language**: TypeScript
- **Chess Engine**: [chess.js](https://github.com/jhlywa/chess.js)
- **Chess UI**: [react-chessboard](https://github.com/Clariity/react-chessboard)
- **Realtime**: [Socket.IO](https://socket.io/)
- **Persistence**: Drizzle ORM + SQLite (dev) or Postgres (Docker/homeserver)
- **Styling**: CSS-in-JS with React inline styles

## Protocol and architecture

- WebSocket protocol v1: [`docs/ws-protocol-v1.md`](docs/ws-protocol-v1.md)
- Shared protocol types: [`shared/ws-protocol.ts`](shared/ws-protocol.ts)
- WebSocket server entrypoint: [`game-server/src/index.ts`](game-server/src/index.ts)

## Credits & Acknowledgments

This project is built on top of excellent open-source libraries:

### Chess Logic

- **[chess.js](https://github.com/jhlywa/chess.js)** by Jeff Hlywa
  - License: BSD-2-Clause
  - Provides chess game logic, move validation, and game state management

### Chess Board UI

- **[react-chessboard](https://github.com/Clariity/react-chessboard)** by Ryan Gregory
  - License: MIT
  - Provides the beautiful, interactive chess board component

**Full license texts are available in [LICENSES.md](LICENSES.md)**

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Future Enhancements

- [x] Online multiplayer support
- [ ] Game history and move notation
- [ ] AI opponent with difficulty levels
- [ ] Opening book and analysis
- [ ] Custom board themes
- [ ] Tournament mode
- [ ] Save/load games

---

Made with ❤️ using React and the amazing chess.js and react-chessboard libraries.
