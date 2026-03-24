/**
 * This file exposes the commitment HTTP controllers.
 * It exists to translate validated HTTP requests, uploaded files and auth context into service calls.
 * It fits the system by keeping the commitment service independent from Express-specific details.
 */
import type { Request, Response } from "express";

import type { AuthenticatedUserContext } from "../types/auth";
import { AppError } from "../utils/app-error";
import type { CommitmentService } from "../services/commitment.service";

/**
 * This class groups the HTTP handlers for commitment workflows.
 * It receives the commitment service as an explicit dependency.
 * It returns controller methods ready for Express routing.
 * It is important because the backend API surface is large and benefits from one consistent transport adapter.
 */
export class CommitmentController {
  /**
   * This constructor wires the controller to the commitment service.
   * It receives the service that implements the commitment lifecycle.
   * It returns a CommitmentController instance.
   * It is important because all routes in this module should reuse the same business logic boundary.
   */
  constructor(private readonly commitmentService: CommitmentService) {}

  /**
   * This function creates a new commitment record from an existing on-chain commitment.
   * It receives the authenticated HTTP request and response objects.
   * It returns an HTTP JSON payload containing the created commitment aggregate.
   * It is important because the database should only persist metadata after the on-chain commitment already exists.
   */
  createCommitment = async (request: Request, response: Response) => {
    const commitment = await this.commitmentService.createCommitment(
      this.getAuthContext(request),
      request.body
    );

    response.status(201).json(commitment);
  };

  /**
   * This function lists commitments for the authenticated wallet.
   * It receives the authenticated HTTP request and response objects.
   * It returns an HTTP JSON array of sanitized commitments.
   * It is important because the dashboard needs one endpoint to render the user's current lifecycle state.
   */
  listCommitments = async (request: Request, response: Response) => {
    const commitments = await this.commitmentService.listCommitmentsForWallet(
      this.getAuthContext(request),
      this.getRequiredParam(request, "wallet")
    );

    response.status(200).json({
      items: commitments
    });
  };

  /**
   * This function stores uploaded evidence for a commitment.
   * It receives the authenticated HTTP request, response and uploaded file.
   * It returns an HTTP JSON payload containing the updated commitment and evidence metadata.
   * It is important because evidence storage is the bridge between user action and AI verification.
   */
  uploadEvidence = async (request: Request, response: Response) => {
    const uploadResult = await this.commitmentService.uploadEvidence(
      this.getAuthContext(request),
      this.getRequiredParam(request, "id"),
      request.body,
      request.file
    );

    response.status(201).json(uploadResult);
  };

  /**
   * This function enqueues an initial verification job for the target commitment.
   * It receives the authenticated HTTP request and response objects.
   * It returns an HTTP 202 payload describing the queued job.
   * It is important because AI and blockchain work should happen asynchronously and idempotently.
   */
  verifyCommitment = async (request: Request, response: Response) => {
    const job = await this.commitmentService.verifyCommitment(
      this.getAuthContext(request),
      this.getRequiredParam(request, "id")
    );

    response.status(202).json(job);
  };

  /**
   * This function records that the user already triggered the on-chain appeal.
   * It receives the authenticated HTTP request and response objects.
   * It returns an HTTP JSON payload containing the updated commitment aggregate.
   * It is important because the product state must explicitly remember that the single appeal path was consumed.
   */
  requestAppeal = async (request: Request, response: Response) => {
    const commitment = await this.commitmentService.recordAppeal(
      this.getAuthContext(request),
      this.getRequiredParam(request, "id"),
      request.body
    );

    response.status(200).json(commitment);
  };

  /**
   * This function enqueues the internal appeal-resolution workflow.
   * It receives the Express request and response objects for a privileged internal route.
   * It returns an HTTP 202 payload describing the queued job.
   * It is important because appeal resolution should be restricted to trusted backend automation.
   */
  resolveAppeal = async (request: Request, response: Response) => {
    const job = await this.commitmentService.resolveAppeal(
      this.getRequiredParam(request, "id")
    );
    response.status(202).json(job);
  };

  /**
   * This function triggers the definitive failed-finalization workflow for a commitment.
   * It receives the Express request and response objects for a privileged internal route.
   * It returns an HTTP JSON payload containing the updated commitment aggregate.
   * It is important because internal automation may need a direct endpoint to settle expired unappealed failures.
   */
  finalizeFailed = async (request: Request, response: Response) => {
    const commitment = await this.commitmentService.finalizeFailedCommitment(
      this.getRequiredParam(request, "id")
    );
    response.status(200).json(commitment);
  };

  /**
   * This function extracts the authenticated user context attached by the auth middleware.
   * It receives the Express request object.
   * It returns the authenticated wallet context.
   * It is important because controller methods should fail fast when a protected route is misconfigured.
   */
  private getAuthContext(request: Request): AuthenticatedUserContext {
    if (request.auth === undefined) {
      throw new AppError(401, "AUTH_MISSING", "Authenticated user context is missing.");
    }

    return request.auth;
  }

  /**
   * This function extracts a required string route parameter from the Express request.
   * It receives the request object and the parameter name that should exist.
   * It returns the validated string parameter value.
   * It is important because strict TypeScript settings should not trust route params to always be present.
   */
  private getRequiredParam(request: Request, key: string) {
    const parameter = request.params[key];

    if (typeof parameter !== "string" || parameter.length === 0) {
      throw new AppError(400, "ROUTE_PARAM_MISSING", `Route parameter "${key}" is required.`);
    }

    return parameter;
  }
}
