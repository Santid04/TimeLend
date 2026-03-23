/**
 * This file creates the Express application used by local development and Vercel.
 * It exists to separate application composition from the process that listens on a port.
 * It fits the system by letting the same API instance run locally or as a serverless handler.
 */
import cors from "cors";
import express from "express";
import type { Express } from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { notFoundMiddleware } from "./middleware/not-found";
import { createApiRouter } from "./routes";

/**
 * This function creates the configured Express application.
 * It receives no arguments because infrastructure dependencies are read from configuration modules.
 * It returns a ready-to-use Express app instance.
 * It is important because it is the single composition root for the backend HTTP layer.
 */
export function createApp(): Express {
  const app = express();

  /**
   * This middleware block configures the shared HTTP protections and request parsing.
   * It receives inbound HTTP requests as part of the normal Express lifecycle.
   * It returns control to the next middleware after applying security and body parsing.
   * It is important because every current and future API route depends on these baseline guarantees.
   */
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_APP_URL
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.use(createApiRouter());
  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}
