import { bigint, index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

export const games = pgTable(
  "games",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().unique(),
    status: text("status").notNull().default("active"),
    initialFen: text("initial_fen").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    finishedAt: bigint("finished_at", { mode: "number" }),
  },
  (table) => ({
    createdAtIdx: index("games_created_at_idx").on(table.createdAt),
  })
);

export const positionEvents = pgTable(
  "position_events",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id").notNull(),
    seq: integer("seq").notNull(),
    fen: text("fen").notNull(),
    moveUci: text("move_uci"),
    moveSan: text("move_san"),
    turn: text("turn").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    gameSeqUnique: uniqueIndex("position_events_game_seq_unique").on(
      table.gameId,
      table.seq
    ),
    gameIdIdx: index("position_events_game_id_idx").on(table.gameId),
  })
);

export const contextEvents = pgTable(
  "context_events",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id").notNull(),
    seq: integer("seq").notNull(),
    kind: text("kind").notNull(),
    payloadJson: text("payload_json").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => ({
    gameSeqUnique: uniqueIndex("context_events_game_seq_unique").on(
      table.gameId,
      table.seq
    ),
    gameIdIdx: index("context_events_game_id_idx").on(table.gameId),
  })
);
