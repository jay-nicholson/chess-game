import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type * as schemaPg from "../db/schema-pg";
import type * as schemaSqlite from "../db/schema-sqlite";

export type PersistedGame = {
  id: string;
  roomId: string;
  status: "active" | "checkmate" | "draw" | "stalemate";
  initialFen: string;
  createdAt: number;
  finishedAt: number | null;
};

export type PersistedPositionEvent = {
  seq: number;
  fen: string;
  moveUci: string | null;
  moveSan: string | null;
  turn: "w" | "b";
  createdAt: number;
};

type SchemaModule = typeof schemaSqlite | typeof schemaPg;

/**
 * SQLite vs Postgres Drizzle clients are not assignable in a union for `.insert`/`.query`.
 * Runtime API is identical; use a single loose type for the DB handle.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbHandle = any;

const createId = () => crypto.randomUUID();

export class EventStore {
  constructor(
    private readonly db: DbHandle,
    private readonly schema: SchemaModule
  ) {}

  async ensureGame(roomId: string, initialFen: string): Promise<PersistedGame> {
    const { games, positionEvents } = this.schema;
    const existing = await this.db.query.games.findFirst({
      where: eq(games.roomId, roomId),
    });
    if (existing) {
      return {
        id: existing.id,
        roomId: existing.roomId,
        status: existing.status as PersistedGame["status"],
        initialFen: existing.initialFen,
        createdAt: existing.createdAt,
        finishedAt: existing.finishedAt ?? null,
      };
    }

    const now = Date.now();
    const gameId = createId();
    await this.db.insert(games).values({
      id: gameId,
      roomId,
      status: "active",
      initialFen,
      createdAt: now,
      finishedAt: null,
    });

    await this.db.insert(positionEvents).values({
      id: createId(),
      gameId,
      seq: 0,
      fen: initialFen,
      moveUci: null,
      moveSan: null,
      turn: "w",
      createdAt: now,
    });

    return {
      id: gameId,
      roomId,
      status: "active",
      initialFen,
      createdAt: now,
      finishedAt: null,
    };
  }

  async getGameByRoomId(roomId: string): Promise<PersistedGame | null> {
    const { games } = this.schema;
    const result = await this.db.query.games.findFirst({
      where: eq(games.roomId, roomId),
    });
    if (!result) return null;
    return {
      id: result.id,
      roomId: result.roomId,
      status: result.status as PersistedGame["status"],
      initialFen: result.initialFen,
      createdAt: result.createdAt,
      finishedAt: result.finishedAt ?? null,
    };
  }

  async getLatestPositionEvent(gameId: string): Promise<PersistedPositionEvent | null> {
    const { positionEvents } = this.schema;
    const result = await this.db.query.positionEvents.findFirst({
      where: eq(positionEvents.gameId, gameId),
      orderBy: [desc(positionEvents.seq)],
    });
    if (!result) return null;
    return {
      seq: result.seq,
      fen: result.fen,
      moveUci: result.moveUci ?? null,
      moveSan: result.moveSan ?? null,
      turn: result.turn as "w" | "b",
      createdAt: result.createdAt,
    };
  }

  /** Highest stored context-event seq for this game (0 if none). Separate from position `seq`. */
  async getMaxContextSeq(gameId: string): Promise<number> {
    const { contextEvents } = this.schema;
    const result = await this.db.query.contextEvents.findFirst({
      where: eq(contextEvents.gameId, gameId),
      orderBy: [desc(contextEvents.seq)],
    });
    return result?.seq ?? 0;
  }

  async appendPositionEvent(input: {
    gameId: string;
    seq: number;
    fen: string;
    moveUci: string | null;
    moveSan: string | null;
    turn: "w" | "b";
  }): Promise<void> {
    const { positionEvents } = this.schema;
    await this.db.insert(positionEvents).values({
      id: createId(),
      gameId: input.gameId,
      seq: input.seq,
      fen: input.fen,
      moveUci: input.moveUci,
      moveSan: input.moveSan,
      turn: input.turn,
      createdAt: Date.now(),
    });
  }

  async appendContextEvent(input: {
    gameId: string;
    seq: number;
    kind: string;
    payload: unknown;
  }): Promise<void> {
    const { contextEvents } = this.schema;
    await this.db.insert(contextEvents).values({
      id: createId(),
      gameId: input.gameId,
      seq: input.seq,
      kind: input.kind,
      payloadJson: JSON.stringify(input.payload),
      createdAt: Date.now(),
    });
  }

  async markGameFinished(gameId: string, status: PersistedGame["status"]): Promise<void> {
    const { games } = this.schema;
    await this.db
      .update(games)
      .set({ status, finishedAt: Date.now() })
      .where(and(eq(games.id, gameId), eq(games.status, "active")));
  }
}
