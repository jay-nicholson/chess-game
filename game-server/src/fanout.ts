import { createAdapter } from "@socket.io/redis-adapter";
import type { Server } from "socket.io";
import { createClient } from "redis";
import { logger } from "./logger";

export const configureFanout = async (
  io: Server,
  redisUrl?: string
): Promise<"memory" | "redis"> => {
  if (!redisUrl) {
    return "memory";
  }

  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));
  logger.info("redis fanout configured", { redisUrl });
  return "redis";
};
