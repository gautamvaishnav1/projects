import http from "node:http";
import { Server } from "socket.io";
import app from "./app";
import { env } from "./config/env";
import { logger, } from "./shared/utils/logger";
import { connectDB, disconnectDB } from "./infrastructure/database/db.connect";
import { setIO } from "./infrastructure/realtime/io";
import { registerSocketServer } from "./modules/realtime/socket.server";

async function main(): Promise<void> {
  logger.secretWarning();

  await connectDB(env.mongoUri);

  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || env.corsOrigins.includes("*") || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(null, false);
      },
      credentials: true
    }
  });
  setIO(io);
  registerSocketServer(io);

  const server = httpServer.listen(env.port, () => {
    logger.info(`Software World API listening on port ${env.port} (${env.nodeEnv})`);
    logger.info(`Health:      http://localhost:${env.port}/health`);
    logger.info(`Auth:        POST http://localhost:${env.port}/api/v1/auth/register`);
  });

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.error(
        `Port ${env.port} is already in use. Another server instance is running.\n` +
          `  Fix 1: stop it            -> npx kill-port ${env.port}   (or close that terminal)\n` +
          `  Fix 2: use another port   -> set PORT=${env.port === 5000 ? 5001 : 5000} in .env`
      );
    } else {
      logger.error(`Server error: ${err.message}`);
    }
    process.exit(1);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.warn(`${signal} received — shutting down gracefully…`);
    server.close(async () => {
      io.close();
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
  });
}

main().catch((err) => {
  logger.error("Fatal startup error", {
    message: err instanceof Error ? err.message : String(err)
  });
  process.exit(1);
});
