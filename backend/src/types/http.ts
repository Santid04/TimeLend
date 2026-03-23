/**
 * This file stores backend HTTP payload types used by the system endpoints.
 * It exists to keep controller and service contracts explicit even in the scaffold stage.
 * It fits the system by making future API expansion more predictable and testable.
 */
export type HealthResponse = {
  environment: string;
  service: string;
  status: "ok";
  timestamp: string;
};

export type VersionResponse = {
  apiVersion: string;
  name: string;
  runtime: string;
  version: string;
};
