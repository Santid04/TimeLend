/**
 * This file defines the fallback middleware for unknown routes.
 * It exists to return a consistent JSON response when no endpoint matches.
 * It fits the system by ensuring API consumers always get machine-readable responses.
 */
import type { Request, Response } from "express";

/**
 * This middleware handles requests that do not match any registered route.
 * It receives the Express request and response objects.
 * It returns a 404 JSON response.
 * It is important because a predictable error contract improves frontend and monitoring behavior.
 */
export function notFoundMiddleware(request: Request, response: Response) {
  response.status(404).json({
    error: "Route not found",
    path: request.originalUrl
  });
}
