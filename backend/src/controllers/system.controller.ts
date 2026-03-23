/**
 * This file exposes the HTTP controllers for backend system routes.
 * It exists to translate service results into Express responses.
 * It fits the system by keeping the transport layer separate from reusable business logic.
 */
import type { Request, Response } from "express";

import { buildHealthResponse, buildVersionResponse } from "../services/system.service";

/**
 * This controller answers the backend health endpoint.
 * It receives the Express request and response objects.
 * It returns an HTTP JSON response with readiness metadata.
 * It is important because infrastructure and local development depend on a simple health check.
 */
export function getHealth(_request: Request, response: Response) {
  response.status(200).json(buildHealthResponse());
}

/**
 * This controller answers the backend version endpoint.
 * It receives the Express request and response objects.
 * It returns an HTTP JSON response with version metadata.
 * It is important because deploy verification and future clients need API version visibility.
 */
export function getVersion(_request: Request, response: Response) {
  response.status(200).json(buildVersionResponse());
}
