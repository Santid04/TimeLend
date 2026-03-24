/**
 * This file defines the middleware used to secure scheduled and internal automation endpoints.
 * It exists so Vercel Cron and trusted internal callers can share one authentication boundary.
 * It fits the system by protecting maintenance routes without exposing them to regular wallet users.
 */
import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { AppError } from "../utils/app-error";

/**
 * This function creates middleware that accepts either the internal API key or the Vercel cron secret.
 * It receives no parameters because both secrets are loaded from validated environment variables.
 * It returns an Express middleware function.
 * It is important because scheduled maintenance and manual ops calls should use strong server-side credentials only.
 */
export function createAutomationAuthMiddleware() {
  return (request: Request, _response: Response, next: NextFunction) => {
    const providedInternalKey = request.headers["x-internal-api-key"];
    const providedAuthorization = request.headers.authorization;
    const cronAuthorized =
      typeof env.CRON_SECRET === "string" && providedAuthorization === `Bearer ${env.CRON_SECRET}`;
    const internalAuthorized = providedInternalKey === env.INTERNAL_API_KEY;

    if (!internalAuthorized && !cronAuthorized) {
      next(new AppError(403, "AUTOMATION_FORBIDDEN", "Invalid automation credentials."));
      return;
    }

    next();
  };
}
