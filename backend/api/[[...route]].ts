/**
 * This file exposes the backend Express app through one catch-all Vercel function.
 * It exists so every backend route is served under /api/* without duplicating route handlers per endpoint.
 * It fits the system by keeping Vercel-specific routing separate from the core Express application.
 */
import type { Express } from "express";

import { createApp } from "../src/express-app";

/**
 * This constant creates the app instance exported to Vercel.
 * It receives no explicit input because configuration is handled inside the app factory.
 * It returns the Express application function compatible with the Vercel Node runtime.
 * It is important because the backend must stay modular while still matching the /api/* deployment requirement.
 */
const app: Express = createApp();

export default app;
