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
import { createHttpLogger } from "./config/logger";
import { AppError } from "./utils/app-error";
import { getApplicationContext } from "./modules/application-context";
import { errorHandler } from "./middlewares/error-handler";
import { notFoundMiddleware } from "./middlewares/not-found";
import { createApiRouter } from "./routes";

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.trim().replace(/\/+$/, "");
  }
}

/**
 * This function creates the configured Express application.
 * It receives no arguments because infrastructure dependencies are read from configuration modules.
 * It returns a ready-to-use Express app instance.
 * It is important because it is the single composition root for the backend HTTP layer.
 */
export function createApp(): Express {
  getApplicationContext();

  const app = express();
  const allowedOrigins = env.FRONTEND_APP_URL.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const normalizedAllowedOrigins = allowedOrigins.map((origin) => normalizeOrigin(origin));

  /**
   * This middleware block configures the shared HTTP protections and request parsing.
   * It receives inbound HTTP requests as part of the normal Express lifecycle.
   * It returns control to the next middleware after applying security and body parsing.
   * It is important because every current and future API route depends on these baseline guarantees.
   */
  app.disable("x-powered-by");
  app.set("json replacer", (_key: string, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  app.set("trust proxy", 1);
  app.use(createHttpLogger());
  app.use(helmet());
  app.use(
    cors({
      origin(requestOrigin, callback) {
        if (requestOrigin === undefined) {
          callback(null, true);
          return;
        }

        const normalizedRequestOrigin = normalizeOrigin(requestOrigin);

        if (normalizedAllowedOrigins.includes(normalizedRequestOrigin)) {
          callback(null, true);
          return;
        }

        callback(
          new AppError(403, "CORS_ORIGIN_FORBIDDEN", "Request origin is not allowed by CORS.", {
            allowedOrigins: normalizedAllowedOrigins,
            requestOrigin: normalizedRequestOrigin,
          }),
        );
      },
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", createApiRouter());
  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}

const app = createApp();

export default app;
