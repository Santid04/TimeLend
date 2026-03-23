/**
 * This file starts the backend as a local long-running HTTP server.
 * It exists so local development can run independently from a serverless platform.
 * It fits the system by keeping the deployment entry point and the dev server entry point separate.
 */
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";

const app = createApp();

/**
 * This function boots the backend local server on the configured port.
 * It receives no parameters because configuration is loaded from the env module.
 * It returns nothing because it starts a long-running process.
 * It is important because local development and future integration tests need a predictable server bootstrap.
 */
function startServer() {
  app.listen(env.PORT, () => {
    logger.info("Backend server is running", {
      apiVersion: env.API_VERSION,
      port: env.PORT
    });
  });
}

startServer();
