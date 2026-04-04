import crypto from "node:crypto";
import { createServer } from "node:http";
import { Chess, Move as ChessMove, Square } from "chess.js";
import { Server } from "socket.io";
import {
  CLOCKS_SCHEMA,
  FIDGET_SAME_SQUARE_INPUT_SCHEMA,
  JOIN_ROOM_INPUT_SCHEMA,
  MOVE_INPUT_SCHEMA,
  RESUME_ROOM_INPUT_SCHEMA,
  STATE_DELTA_EVENT_SCHEMA,
  STATE_SNAPSHOT_EVENT_SCHEMA,
  type ClientToServerEvents,
  type ErrorCode,
  type ServerToClientEvents,
  type Side,
} from "../../shared/ws-protocol";
import {
  OFF_TURN_FIDGET_SNARKS,
  ON_TURN_CANCEL_SNARKS,
  pickRandomWithoutRepeat,
} from "../../shared/snark";
import { config } from "./config";
import { createDb, initDbIfNeeded } from "./db/client";
import { configureFanout } from "./fanout";
import { logger } from "./logger";
import { SlidingWindowRateLimiter } from "./rate-limit";
import { EventStore, type PersistedGame } from "./store/event-store";

type PlayerRole = "player" | "spectator";
type RoomStatus = "active" | "checkmate" | "draw" | "stalemate";

type RoomState = {
  game: PersistedGame;
  chess: Chess;
  seq: number;
  /** Monotonic counter for `context_events` rows (snark/fidget); independent of position `seq`. */
  contextEventSeq: number;
  status: RoomStatus;
  winner: Side | null;
  clocks: {
    whiteMs: number;
    blackMs: number;
    updatedAt: number;
    /** False until both White and Black seats have a session; then clocks run. */
    running: boolean;
  };
  sessionsBySide: Partial<Record<Side, string>>;
  sideBySession: Map<string, Side>;
  lastSnark: {
    on_turn_cancel: string | null;
    off_turn_fidget: string | null;
  };
};

const toUci = (move: { from: string; to: string; promotion?: string }): string =>
  `${move.from}${move.to}${move.promotion ?? ""}`;

const statusFromChess = (
  chess: Chess
): { status: RoomStatus; winner: Side | null } => {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === "w" ? "b" : "w";
    return { status: "checkmate", winner };
  }
  if (chess.isStalemate()) {
    return { status: "stalemate", winner: null };
  }
  if (chess.isDraw()) {
    return { status: "draw", winner: null };
  }
  return { status: "active", winner: null };
};

const roomChannel = (roomId: string) => `room:${roomId}`;
const createSessionToken = () => crypto.randomBytes(24).toString("base64url");

const conn = createDb();
const eventStore = new EventStore(conn.db, conn.schema);
const rooms = new Map<string, RoomState>();
const limiter = new SlidingWindowRateLimiter(config.playerRateLimitPerMinute, 60_000);
const fidgetLimiter = new SlidingWindowRateLimiter(config.fidgetRateLimitPerMinute, 60_000);

const httpServer = createServer();

httpServer.on("request", (req, res) => {
  const u = req.url ?? "";
  if (req.method === "GET" && (u === "/health" || u.startsWith("/health?"))) {
    const key = process.env.GAME_SERVER_HEALTH_KEY;
    if (key) {
      const sent = req.headers["x-game-server-health"];
      if (sent !== key) {
        res.statusCode = 401;
        res.end();
        return;
      }
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, ts: Date.now() }));
    return;
  }
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors:
    config.corsOrigins.length > 0
      ? { origin: config.corsOrigins, credentials: true }
      : undefined,
  pingInterval: config.heartbeatIntervalMs,
  pingTimeout: config.heartbeatTimeoutMs,
});

const playNamespace = io.of("/play");
const watchNamespace = io.of("/watch");

type AppSocket = typeof playNamespace extends { on: (event: "connection", cb: (s: infer S) => void) => void } ? S : never;

const emitError = (
  socket: AppSocket,
  code: ErrorCode,
  message: string,
  retryable = false
) => {
  socket.emit("error", { code, message, retryable });
};

/** Singleflight: two concurrent join_room calls for a new room must share one RoomState or both get White. */
const roomEnsurePromises = new Map<string, Promise<RoomState>>();

const ensureRoom = async (roomId: string): Promise<RoomState> => {
  const existing = rooms.get(roomId);
  if (existing) return existing;

  let inflight = roomEnsurePromises.get(roomId);
  if (inflight) return inflight;

  inflight = (async (): Promise<RoomState> => {
    try {
      const again = rooms.get(roomId);
      if (again) return again;

      const seedGame = await eventStore.ensureGame(roomId, new Chess().fen());
      const latest = await eventStore.getLatestPositionEvent(seedGame.id);
      const maxContextSeq = await eventStore.getMaxContextSeq(seedGame.id);
      const chess = new Chess(latest?.fen ?? seedGame.initialFen);
      const state = statusFromChess(chess);
      const room: RoomState = {
        game: seedGame,
        chess,
        seq: latest?.seq ?? 0,
        contextEventSeq: maxContextSeq,
        status: state.status,
        winner: state.winner,
        clocks: {
          whiteMs: config.initialClockMs,
          blackMs: config.initialClockMs,
          updatedAt: Date.now(),
          running: false,
        },
        sessionsBySide: {},
        sideBySession: new Map(),
        lastSnark: {
          on_turn_cancel: null,
          off_turn_fidget: null,
        },
      };
      rooms.set(roomId, room);
      return room;
    } finally {
      roomEnsurePromises.delete(roomId);
    }
  })();

  roomEnsurePromises.set(roomId, inflight);
  return inflight;
};

const serializeRoomSnapshot = (room: RoomState) => {
  const payload = {
    roomId: room.game.roomId,
    seq: room.seq,
    fen: room.chess.fen(),
    status: room.status,
    winner: room.winner,
    turn: room.chess.turn() as Side,
    clocks: room.clocks,
  };
  return STATE_SNAPSHOT_EVENT_SCHEMA.parse(payload);
};

const emitDelta = (
  room: RoomState,
  move: Pick<ChessMove, "san" | "from" | "to" | "promotion"> | null
) => {
  const payload = STATE_DELTA_EVENT_SCHEMA.parse({
    roomId: room.game.roomId,
    seq: room.seq,
    fen: room.chess.fen(),
    status: room.status,
    winner: room.winner,
    turn: room.chess.turn() as Side,
    moveUci: move ? toUci(move) : null,
    moveSan: move?.san ?? null,
    clocks: CLOCKS_SCHEMA.parse(room.clocks),
  });
  playNamespace.to(roomChannel(room.game.roomId)).emit("state_delta", payload);
  watchNamespace.to(roomChannel(room.game.roomId)).emit("state_delta", payload);
};

const bothPlayersSeated = (room: RoomState) =>
  Boolean(room.sessionsBySide.w && room.sessionsBySide.b);

/** When the second seat fills, start clocks and anchor `updatedAt` so no time elapses before then. */
const maybeStartClocksForRoom = (room: RoomState): boolean => {
  if (!bothPlayersSeated(room) || room.clocks.running) return false;
  room.clocks.running = true;
  room.clocks.updatedAt = Date.now();
  return true;
};

const broadcastRoomSnapshot = (roomId: string) => {
  const room = rooms.get(roomId);
  if (!room) return;
  const snap = serializeRoomSnapshot(room);
  playNamespace.to(roomChannel(roomId)).emit("state_snapshot", snap);
  watchNamespace.to(roomChannel(roomId)).emit("state_snapshot", snap);
};

const applyClockForTurn = (room: RoomState, turn: Side) => {
  if (!room.clocks.running) return;
  const now = Date.now();
  const elapsed = now - room.clocks.updatedAt;
  room.clocks.updatedAt = now;
  if (turn === "w") {
    room.clocks.whiteMs = Math.max(0, room.clocks.whiteMs - elapsed);
  } else {
    room.clocks.blackMs = Math.max(0, room.clocks.blackMs - elapsed);
  }
};

const isRateLimited = (socketId: string) => !limiter.check(socketId);
const isFidgetRateLimited = (socketId: string) => !fidgetLimiter.check(socketId);

const assignSide = (room: RoomState, sessionToken: string): Side | null => {
  const existing = room.sideBySession.get(sessionToken);
  if (existing) return existing;
  if (!room.sessionsBySide.w) {
    room.sessionsBySide.w = sessionToken;
    room.sideBySession.set(sessionToken, "w");
    return "w";
  }
  if (!room.sessionsBySide.b) {
    room.sessionsBySide.b = sessionToken;
    room.sideBySession.set(sessionToken, "b");
    return "b";
  }
  return null;
};

const canJoinAsSpectator = async (roomId: string): Promise<boolean> => {
  const sockets = await watchNamespace.in(roomChannel(roomId)).fetchSockets();
  return sockets.length < config.spectatorCapPerRoom;
};

playNamespace.on("connection", (socket) => {
  logger.info("player socket connected", { socketId: socket.id });

  socket.on("join_room", async (rawPayload) => {
    const parsed = JOIN_ROOM_INPUT_SCHEMA.safeParse(rawPayload);
    if (!parsed.success) {
      emitError(socket, "ERR_BAD_PAYLOAD", "Invalid join payload");
      return;
    }

    const payload = parsed.data;
    if (payload.role === "spectator") {
      emitError(socket, "ERR_UNAUTHORIZED", "Use /watch namespace for spectators");
      return;
    }

    const room = await ensureRoom(payload.roomId);
    const sessionToken = payload.sessionToken ?? createSessionToken();
    const side = assignSide(room, sessionToken);
    if (!side) {
      emitError(socket, "ERR_ROOM_FULL", "Both player slots are occupied");
      return;
    }

    socket.data.roomId = payload.roomId;
    socket.data.sessionToken = sessionToken;
    socket.data.side = side;
    socket.join(roomChannel(payload.roomId));

    const startedClocks = maybeStartClocksForRoom(room);
    if (startedClocks) {
      broadcastRoomSnapshot(payload.roomId);
    }

    const joinedPayload = {
      roomId: payload.roomId,
      side,
      role: "player" as PlayerRole,
      sessionToken,
      state: serializeRoomSnapshot(room),
    };
    socket.emit("joined", joinedPayload);
    socket.emit("state_snapshot", serializeRoomSnapshot(room));
    logger.info("player joined room", {
      socketId: socket.id,
      roomId: payload.roomId,
      side,
    });
  });

  socket.on("resume_room", async (rawPayload) => {
    const parsed = RESUME_ROOM_INPUT_SCHEMA.safeParse(rawPayload);
    if (!parsed.success) {
      emitError(socket, "ERR_BAD_PAYLOAD", "Invalid resume payload");
      return;
    }
    const payload = parsed.data;
    const room = await ensureRoom(payload.roomId);
    const side = room.sideBySession.get(payload.sessionToken);
    if (!side) {
      emitError(socket, "ERR_SESSION_EXPIRED", "Session token is no longer valid");
      return;
    }

    socket.data.roomId = payload.roomId;
    socket.data.sessionToken = payload.sessionToken;
    socket.data.side = side;
    socket.join(roomChannel(payload.roomId));

    if (payload.lastSeq !== room.seq) {
      socket.emit("state_snapshot", serializeRoomSnapshot(room));
    }

    socket.emit("joined", {
      roomId: payload.roomId,
      side,
      role: "player" as PlayerRole,
      sessionToken: payload.sessionToken,
      state: serializeRoomSnapshot(room),
    });
  });

  socket.on("submit_move", async (rawPayload) => {
    if (isRateLimited(socket.id)) {
      emitError(socket, "ERR_RATE_LIMITED", "Too many move attempts", true);
      return;
    }

    const parsed = MOVE_INPUT_SCHEMA.safeParse(rawPayload?.move);
    const wrapper = rawPayload as { roomId?: string; clientSeq?: number; move?: unknown };
    if (!parsed.success || !wrapper?.roomId || typeof wrapper?.clientSeq !== "number") {
      emitError(socket, "ERR_BAD_PAYLOAD", "Invalid move payload");
      return;
    }

    const room = rooms.get(wrapper.roomId);
    if (!room) {
      emitError(socket, "ERR_ROOM_NOT_FOUND", "Room not found");
      return;
    }

    const side = socket.data.side as Side | undefined;
    if (!side) {
      emitError(socket, "ERR_UNAUTHORIZED", "Join room before moving");
      return;
    }

    const sessionToken = socket.data.sessionToken as string | undefined;
    if (!sessionToken || room.sessionsBySide[side] !== sessionToken) {
      emitError(socket, "ERR_UNAUTHORIZED", "Session token does not match this seat");
      return;
    }

    if (wrapper.clientSeq !== room.seq) {
      emitError(socket, "ERR_SEQ_GAP", "Client out of sync with room sequence", true);
      socket.emit("state_snapshot", serializeRoomSnapshot(room));
      return;
    }

    if (!bothPlayersSeated(room)) {
      emitError(
        socket,
        "ERR_WAITING_FOR_OPPONENT",
        "Both players must be connected before moves are allowed"
      );
      return;
    }

    if ((room.chess.turn() as Side) !== side) {
      emitError(socket, "ERR_NOT_YOUR_TURN", "It is not your turn");
      return;
    }

    applyClockForTurn(room, side);
    const result = room.chess.move(parsed.data);
    if (!result) {
      emitError(socket, "ERR_ILLEGAL_MOVE", "Illegal move");
      return;
    }

    room.seq += 1;
    const gameState = statusFromChess(room.chess);
    room.status = gameState.status;
    room.winner = gameState.winner;

    await eventStore.appendPositionEvent({
      gameId: room.game.id,
      seq: room.seq,
      fen: room.chess.fen(),
      moveUci: toUci(parsed.data),
      moveSan: result.san ?? null,
      turn: room.chess.turn() as Side,
    });

    if (room.status !== "active") {
      await eventStore.markGameFinished(room.game.id, room.status);
    }

    emitDelta(room, result);
  });

  socket.on("fidget_same_square", async (rawPayload) => {
    if (isFidgetRateLimited(socket.id)) {
      emitError(socket, "ERR_RATE_LIMITED", "Too many fidget events", true);
      return;
    }
    const parsed = FIDGET_SAME_SQUARE_INPUT_SCHEMA.safeParse(rawPayload);
    if (!parsed.success) {
      emitError(socket, "ERR_BAD_PAYLOAD", "Invalid fidget payload");
      return;
    }
    const payload = parsed.data;
    const room = rooms.get(payload.roomId);
    if (!room) {
      emitError(socket, "ERR_ROOM_NOT_FOUND", "Room not found");
      return;
    }
    const side = socket.data.side as Side | undefined;
    if (!side) {
      emitError(socket, "ERR_UNAUTHORIZED", "Join room before sending fidget");
      return;
    }

    const sessionToken = socket.data.sessionToken as string | undefined;
    if (!sessionToken || room.sessionsBySide[side] !== sessionToken) {
      emitError(socket, "ERR_UNAUTHORIZED", "Session token does not match this seat");
      return;
    }

    if (!bothPlayersSeated(room)) {
      emitError(
        socket,
        "ERR_WAITING_FOR_OPPONENT",
        "Both players must be connected before fidget events are allowed"
      );
      return;
    }

    const piece = room.chess.get(payload.square as Square);
    if (!piece || piece.color !== side) {
      emitError(socket, "ERR_UNAUTHORIZED", "Square does not contain your piece");
      return;
    }

    const kind =
      (room.chess.turn() as Side) === side
        ? ("on_turn_cancel" as const)
        : ("off_turn_fidget" as const);
    const text = pickRandomWithoutRepeat(
      kind === "on_turn_cancel" ? ON_TURN_CANCEL_SNARKS : OFF_TURN_FIDGET_SNARKS,
      room.lastSnark[kind]
    );
    room.lastSnark[kind] = text;

    room.contextEventSeq += 1;
    const contextSeq = room.contextEventSeq;

    await eventStore.appendContextEvent({
      gameId: room.game.id,
      seq: contextSeq,
      kind,
      payload: {
        text,
        actorSide: side,
      },
    });

    const snarkPayload = {
      roomId: room.game.roomId,
      seq: contextSeq,
      kind,
      text,
      actorSide: side,
    };

    playNamespace.to(roomChannel(payload.roomId)).emit("snark_event", snarkPayload);
    watchNamespace.to(roomChannel(payload.roomId)).emit("snark_event", snarkPayload);
  });

  socket.on("ping", ({ t }) => {
    socket.emit("pong", { t });
  });
});

watchNamespace.on("connection", (socket) => {
  logger.info("spectator socket connected", { socketId: socket.id });
  socket.on("join_room", async (rawPayload) => {
    const parsed = JOIN_ROOM_INPUT_SCHEMA.safeParse(rawPayload);
    if (!parsed.success) {
      emitError(socket, "ERR_BAD_PAYLOAD", "Invalid join payload");
      return;
    }
    const payload = parsed.data;
    if (payload.role !== "spectator") {
      emitError(socket, "ERR_UNAUTHORIZED", "Use /play namespace for players");
      return;
    }

    if (!(await canJoinAsSpectator(payload.roomId))) {
      emitError(socket, "ERR_ROOM_FULL", "Spectator capacity reached");
      return;
    }

    const room = await ensureRoom(payload.roomId);
    socket.join(roomChannel(payload.roomId));
    socket.emit("joined", {
      roomId: payload.roomId,
      side: null,
      role: "spectator" as PlayerRole,
      sessionToken: null,
      state: serializeRoomSnapshot(room),
    });
    socket.emit("state_snapshot", serializeRoomSnapshot(room));
  });

  socket.on("resume_room", (rawPayload) => {
    const parsed = RESUME_ROOM_INPUT_SCHEMA.safeParse(rawPayload);
    if (!parsed.success) {
      emitError(socket, "ERR_BAD_PAYLOAD", "Invalid resume payload");
      return;
    }
    const room = rooms.get(parsed.data.roomId);
    if (!room) {
      emitError(socket, "ERR_ROOM_NOT_FOUND", "Room not found");
      return;
    }
    socket.join(roomChannel(parsed.data.roomId));
    socket.emit("state_snapshot", serializeRoomSnapshot(room));
  });

  socket.on("ping", ({ t }) => socket.emit("pong", { t }));
});

const start = async () => {
  await initDbIfNeeded(conn);
  const fanoutMode = await configureFanout(io, config.redisUrl);
  httpServer.listen(config.port, () => {
    logger.info("game server listening", {
      port: config.port,
      fanoutMode,
      reconnectWindowMs: config.reconnectWindowMs,
      heartbeatTimeoutMs: config.heartbeatTimeoutMs,
      corsOrigins: config.corsOrigins,
    });
  });
};

start().catch((error) => {
  logger.error("fatal startup error", { error: String(error) });
  process.exit(1);
});

process.on("SIGINT", () => {
  logger.info("shutting down game server");
  conn.close();
  process.exit(0);
});
