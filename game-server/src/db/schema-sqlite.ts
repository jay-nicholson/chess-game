import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().unique(),
    status: text("status").notNull().default("active"),
    initialFen: text("initial_fen").notNull(),
    /** Epoch ms; plain integer (not timestamp_ms mode — we pass Date.now() numbers). */
    createdAt: integer("created_at").notNull(),
    finishedAt: integer("finished_at"),
  },
  (table) => ({
    createdAtIdx: index("games_created_at_idx").on(table.createdAt),
  })
);

export const positionEvents = sqliteTable(
  "position_events",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id").notNull(),
    seq: integer("seq").notNull(),
    fen: text("fen").notNull(),
    moveUci: text("move_uci"),
    moveSan: text("move_san"),
    turn: text("turn").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    gameSeqUnique: uniqueIndex("position_events_game_seq_unique").on(
      table.gameId,
      table.seq
    ),
    gameIdIdx: index("position_events_game_id_idx").on(table.gameId),
  })
);

export const contextEvents = sqliteTable(
  "context_events",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id").notNull(),
    seq: integer("seq").notNull(),
    kind: text("kind").notNull(),
    payloadJson: text("payload_json").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => ({
    gameSeqUnique: uniqueIndex("context_events_game_seq_unique").on(
      table.gameId,
      table.seq
    ),
    gameIdIdx: index("context_events_game_id_idx").on(table.gameId),
  })
);
