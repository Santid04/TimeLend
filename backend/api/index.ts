/**
 * This file exposes the backend Express app as the Vercel function entry point.
 * It exists so the backend can be deployed separately on Vercel without changing the app composition.
 * It fits the system by reusing the same application factory used in local development.
 */
import { createApp } from "../src/app";
import type { Express } from "express";

/**
 * This constant creates the app instance exported to Vercel.
 * It receives no explicit input because configuration is handled inside the app factory.
 * It returns the Express application function compatible with the Vercel Node runtime.
 * It is important because it keeps deployment-specific wiring out of the core backend code.
 */
const app: Express = createApp();

export default app;
