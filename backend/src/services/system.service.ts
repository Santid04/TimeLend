/**
 * This file builds the backend system payloads used by the public status endpoints.
 * It exists to keep controllers thin and free from low-level formatting logic.
 * It fits the system by creating a service layer pattern that future domain modules can follow.
 */
import { env } from "../config/env";
import type { HealthResponse, VersionResponse } from "../types/http";
import { getBuildVersion } from "../utils/build-version";

/**
 * This function builds the response body for the health endpoint.
 * It receives no arguments because the payload comes from current runtime state.
 * It returns a typed health response object.
 * It is important because external systems need a stable readiness contract.
 */
export function buildHealthResponse(): HealthResponse {
  return {
    environment: env.NODE_ENV,
    service: env.APP_NAME,
    status: "ok",
    timestamp: new Date().toISOString()
  };
}

/**
 * This function builds the response body for the version endpoint.
 * It receives no arguments because the payload is derived from config and package metadata.
 * It returns a typed version response object.
 * It is important because deployments and clients need to confirm which backend build is running.
 */
export function buildVersionResponse(): VersionResponse {
  return {
    apiVersion: env.API_VERSION,
    name: "timelend-backend",
    runtime: `node-${process.version}`,
    version: getBuildVersion()
  };
}
