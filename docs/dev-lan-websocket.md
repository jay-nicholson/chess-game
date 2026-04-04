# Development: WebSocket URL from another device (LAN)

When the web app connects to the game server using **`NEXT_PUBLIC_WS_URL`**, the default `http://localhost:4001` is correct only on the **same machine** that runs `npm run dev:ws`.

On a **phone, tablet, or second computer**, `localhost` (or `127.0.0.1`) refers to **that device**, not the computer running Next.js and the game server. The Socket.IO client then fails with a `connect_error`, often surfaced as “Cannot connect to game server at http://localhost:4001”.

## Fix (typical dev setup)

1. On the **host** that runs Next.js and the game server, note its **LAN IP** (e.g. `192.168.x.x` from your OS network settings, or `ipconfig getifaddr en0` on macOS).

2. In **`.env.local`** (Next.js), set the **public** websocket origin to that IP (port must match `WS_PORT`, default `4001`):

   ```bash
   NEXT_PUBLIC_WS_URL=http://YOUR_LAN_IP:4001
   ```

3. **Restart** `npm run dev` so the new value is picked up (`NEXT_PUBLIC_*` is inlined at build/dev compile time).

4. On the other device, open the app using the **same host** in the browser, e.g. `http://YOUR_LAN_IP:3000/play/...`, not `http://localhost:3000`.

5. If **`ALLOWED_ORIGINS`** is set for the game server process, include the exact page origin clients use, e.g. `http://YOUR_LAN_IP:3000`, plus `http://localhost:3000` if you still use that on the dev machine. If it is unset, Socket.IO CORS is left permissive for typical local development.

6. If the **Next.js** dev server is not reachable from the LAN at all, bind it on all interfaces, e.g. `next dev --turbopack -H 0.0.0.0`. If Next shows **HMR / cross-origin** warnings when using a LAN origin, add that origin to `allowedDevOrigins` in `next.config.ts`.

7. Ensure the host **firewall** allows inbound TCP on the Next port (e.g. `3000`) and the websocket port (e.g. `4001`).

The Node `http` server for the game process listens on all interfaces when no bind address is passed; the usual issue is **only** the client URL baked into the frontend still pointing at `localhost`.
