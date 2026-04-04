const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const splitCsv = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const config = {
  port: toInt(process.env.WS_PORT, 4001),
  corsOrigins: splitCsv(process.env.ALLOWED_ORIGINS),
  redisUrl: process.env.REDIS_URL,
  heartbeatIntervalMs: toInt(process.env.HEARTBEAT_INTERVAL_MS, 10000),
  heartbeatTimeoutMs: toInt(process.env.HEARTBEAT_TIMEOUT_MS, 30000),
  playerRateLimitPerMinute: toInt(process.env.RATE_LIMIT_PER_MINUTE, 80),
  /** Separate cap for same-square fidget/snark spam. */
  fidgetRateLimitPerMinute: toInt(process.env.FIDGET_RATE_LIMIT_PER_MINUTE, 40),
  reconnectWindowMs: toInt(process.env.RECONNECT_WINDOW_MS, 60_000),
  initialClockMs: toInt(process.env.INITIAL_CLOCK_MS, 20 * 60 * 1000),
  spectatorCapPerRoom: toInt(process.env.SPECTATOR_CAP_PER_ROOM, 50),
};
