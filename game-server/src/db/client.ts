import fs from "node:fs";
import path from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schemaPg from "./schema-pg";
import * as schemaSqlite from "./schema-sqlite";

const DEFAULT_DATABASE_URL = "file:./game-server/data/chess.db";

const resolveSqlitePath = (databaseUrl: string): string => {
  if (databaseUrl.startsWith("file:")) {
    return databaseUrl.slice("file:".length);
  }
  return databaseUrl;
};

const POSTGRES_INIT_SQL = `
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  initial_fen TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  finished_at BIGINT
);
CREATE INDEX IF NOT EXISTS games_created_at_idx ON games (created_at);

CREATE TABLE IF NOT EXISTS position_events (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  fen TEXT NOT NULL,
  move_uci TEXT,
  move_san TEXT,
  turn TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS position_events_game_seq_unique ON position_events (game_id, seq);
CREATE INDEX IF NOT EXISTS position_events_game_id_idx ON position_events (game_id);

CREATE TABLE IF NOT EXISTS context_events (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  kind TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS context_events_game_seq_unique ON context_events (game_id, seq);
CREATE INDEX IF NOT EXISTS context_events_game_id_idx ON context_events (game_id);
`;

type SqliteDatabase = InstanceType<typeof BetterSqlite3>;

export type DbConnection = {
  kind: "sqlite" | "postgres";
  sqlite: SqliteDatabase | null;
  pool: Pool | null;
  db:
    | ReturnType<typeof drizzleSqlite<typeof schemaSqlite>>
    | ReturnType<typeof drizzlePg<typeof schemaPg>>;
  schema: typeof schemaSqlite | typeof schemaPg;
  close: () => void;
};

export const createDb = (): DbConnection => {
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

  if (databaseUrl.startsWith("postgres")) {
    const pool = new Pool({ connectionString: databaseUrl });
    const db = drizzlePg(pool, { schema: schemaPg });
    return {
      kind: "postgres",
      sqlite: null,
      pool,
      db,
      schema: schemaPg,
      close: () => {
        void pool.end();
      },
    };
  }

  const dbPath = resolveSqlitePath(databaseUrl);
  const absolutePath = path.resolve(process.cwd(), dbPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const sqlite = new BetterSqlite3(absolutePath);

  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'active',
      initial_fen TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      finished_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS position_events (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      fen TEXT NOT NULL,
      move_uci TEXT,
      move_san TEXT,
      turn TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS position_events_game_seq_unique
      ON position_events(game_id, seq);

    CREATE INDEX IF NOT EXISTS position_events_game_id_idx
      ON position_events(game_id);

    CREATE TABLE IF NOT EXISTS context_events (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      kind TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS context_events_game_seq_unique
      ON context_events(game_id, seq);

    CREATE INDEX IF NOT EXISTS context_events_game_id_idx
      ON context_events(game_id);
  `);

  const db = drizzleSqlite(sqlite, { schema: schemaSqlite });
  return {
    kind: "sqlite",
    sqlite,
    pool: null,
    db,
    schema: schemaSqlite,
    close: () => {
      sqlite.close();
    },
  };
};

/** Run after createDb() before accepting traffic (Postgres DDL). */
export async function initDbIfNeeded(conn: DbConnection): Promise<void> {
  if (conn.kind === "postgres" && conn.pool) {
    await conn.pool.query(POSTGRES_INIT_SQL);
  }
}
