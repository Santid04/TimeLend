/**
 * This file starts the backend as a local long-running HTTP server.
 * It exists so local development can run independently from a serverless platform.
 * It fits the system by keeping the deployment entry point and the dev server entry point separate.
 */
import { prisma } from "@timelend/database";
import type { Server } from "node:http";

import { createApp } from "./express-app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { getApplicationContext } from "./modules/application-context";

const app = createApp();

/**
 * This function boots the backend local server on the configured port.
 * It receives no parameters because configuration is loaded from the env module.
 * It returns a promise that resolves after the HTTP server starts listening.
 * It is important because local development and future integration tests need a predictable server bootstrap.
 */
async function startServer() {
  await prisma.$connect();
  getApplicationContext().commitmentService.startMaintenanceLoop();

  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        apiVersion: env.API_VERSION,
        port: env.PORT,
      },
      "Backend server is running",
    );
  });

  registerShutdownHooks(server);
}

/**
 * This function registers graceful shutdown hooks for the local backend server.
 * It receives the live HTTP server instance.
 * It returns nothing because it only installs process listeners.
 * It is important because Prisma connections and pending logs should close cleanly during local development.
 */
function registerShutdownHooks(server: Server) {
  const shutdown = async (signal: NodeJS.Signals) => {
    logger.info({ signal }, "Shutting down backend server");
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

void startServer().catch(async (error) => {
  logger.error({ error }, "Failed to start backend server");
  await prisma.$disconnect();
  process.exit(1);
});
