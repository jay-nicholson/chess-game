import type { Config } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL ?? "file:./game-server/data/chess.db";

export default {
  schema: "./game-server/src/db/schema-sqlite.ts",
  out: "./game-server/drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
