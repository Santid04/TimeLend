/**
 * This file defines the centralized Express error middleware for the backend scaffold.
 * It exists to keep error serialization and logging in one place.
 * It fits the system by giving future domain features a consistent failure boundary.
 */
import type { NextFunction, Request, Response } from "express";

import { logger } from "../config/logger";

/**
 * This middleware converts thrown errors into safe JSON responses.
 * It receives the error plus the standard Express request pipeline arguments.
 * It returns a 500-level JSON response after logging the failure.
 * It is important because AI, uploads and blockchain integrations will need one central error boundary.
 */
export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
) {
  logger.error("Unhandled backend error", {
    error,
    path: request.originalUrl
  });

  response.status(500).json({
    error: "Internal server error"
  });
}
