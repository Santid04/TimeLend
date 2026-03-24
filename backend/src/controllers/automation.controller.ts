/**
 * This file exposes the automation HTTP controllers.
 * It exists to isolate maintenance and scheduled-operation transport logic from the commitment service.
 * It fits the system by keeping Vercel cron endpoints modular and testable.
 */
import type { Request, Response } from "express";

import type { CommitmentService } from "../services/commitment.service";

/**
 * This class groups the automation handlers used by scheduled jobs and internal maintenance tools.
 * It receives the commitment service that owns the relevant workflows.
 * It returns controller methods ready for Express routing.
 * It is important because cron-safe routes should still follow the same controller pattern as the rest of the backend.
 */
export class AutomationController {
  /**
   * This constructor wires the controller to the commitment service.
   * It receives the service that owns failed-finalization maintenance.
   * It returns an AutomationController instance.
   * It is important because scheduled routes should reuse the exact same domain logic as manual actions.
   */
  constructor(private readonly commitmentService: CommitmentService) {}

  /**
   * This function runs the failed-finalization sweep and returns a compact summary payload.
   * It receives the Express request and response objects for a privileged automation route.
   * It returns an HTTP JSON response describing the sweep result.
   * It is important because Vercel Cron and manual operators need one stable maintenance endpoint.
   */
  finalizeExpiredFailures = async (_request: Request, response: Response) => {
    const summary = await this.commitmentService.finalizeExpiredFailures();
    response.status(200).json(summary);
  };
}
