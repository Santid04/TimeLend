/**
 * This file registers the automation routes used by cron jobs and internal maintenance callers.
 * It exists to keep privileged maintenance endpoints separate from public API modules.
 * It fits the system by making scheduled operations explicit in the router layer.
 */
import { Router } from "express";
import type { Router as ExpressRouter, RequestHandler } from "express";

import type { AutomationController } from "../controllers/automation.controller";
import { asyncHandler } from "../utils/async-handler";

type AutomationRouterDependencies = {
  automationController: AutomationController;
  requireAutomation: RequestHandler;
};

/**
 * This function creates the router for automation-only endpoints.
 * It receives the controller plus the middleware that authenticates cron or internal callers.
 * It returns an Express router ready to mount under the automation prefix.
 * It is important because scheduled maintenance should not share the same trust boundary as browser-facing routes.
 */
export function createAutomationRouter(dependencies: AutomationRouterDependencies): ExpressRouter {
  const router = Router();

  router.get(
    "/finalize-expired-failures",
    dependencies.requireAutomation,
    asyncHandler(dependencies.automationController.finalizeExpiredFailures),
  );
  router.post(
    "/finalize-expired-failures",
    dependencies.requireAutomation,
    asyncHandler(dependencies.automationController.finalizeExpiredFailures),
  );

  return router;
}
