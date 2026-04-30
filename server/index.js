import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { createClient } from "redis";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { registerGridHandlers } from "./socket/gridHandler.js";
import {
  attachRedisClient,
  getLeaderboard,
} from "./services/gridService.js";

const PORT = Number(process.env.PORT) || 8080;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const app = express();

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    const payload = {
      ok: true,
      service: "realtime-grid",
      phase: 5,
      redis: false,
    };
    const cmd = /** @type {import('redis').RedisClientType} */ (
      app.locals.redisCmd
    );
    if (cmd?.isReady) {
      await cmd.ping();
      payload.redis = true;
    }
    res.json(payload);
  } catch {
    res.status(503).json({
      ok: false,
      service: "realtime-grid",
      phase: 5,
      redis: false,
    });
  }
});

app.get("/api/leaderboard", async (_req, res) => {
  try {
    const board = await getLeaderboard();
    res.json(board);
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: "leaderboard_unavailable" });
  }
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

async function bootstrap() {
  const pubClient = createClient({ url: REDIS_URL });
  const subClient = pubClient.duplicate();
  const cmdClient = createClient({ url: REDIS_URL });

  const onRedisError = (label) => (err) => {
    console.error(`Redis (${label}):`, err.message);
  };
  pubClient.on("error", onRedisError("pub"));
  subClient.on("error", onRedisError("sub"));
  cmdClient.on("error", onRedisError("cmd"));

  await Promise.all([
    pubClient.connect(),
    subClient.connect(),
    cmdClient.connect(),
  ]);

  io.adapter(createAdapter(pubClient, subClient));
  attachRedisClient(cmdClient);
  app.locals.redisCmd = cmdClient;

  registerGridHandlers(io);

  httpServer.listen(PORT, () => {
    console.log(`HTTP + Socket.IO on http://localhost:${PORT}`);
    console.log(`Redis at ${REDIS_URL} (adapter + shared grid state)`);
  });

  const shutdown = async () => {
    httpServer.close();
    await Promise.allSettled([
      pubClient.quit(),
      subClient.quit(),
      cmdClient.quit(),
    ]);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
