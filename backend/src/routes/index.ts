/**
 * This file mounts all backend route modules into one root router.
 * It exists to provide a single composition point for the HTTP surface.
 * It fits the system by making future modules like commitments, uploads and appeals easy to register.
 */
import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import { createSystemRouter } from "./system.routes";

/**
 * This function creates the root router for the backend application.
 * It receives no parameters because each route module manages its own dependencies.
 * It returns an Express router with all currently enabled endpoints.
 * It is important because the application boot process only needs to mount one router entry point.
 */
export function createApiRouter(): ExpressRouter {
  const router = Router();

  router.use(createSystemRouter());

  return router;
}
