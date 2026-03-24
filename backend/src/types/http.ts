/**
 * This file stores backend HTTP payload types shared across controllers.
 * It exists to make response shapes explicit and stable.
 * It fits the system by reducing transport-layer ambiguity while the backend grows in complexity.
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

export type AcceptedJobResponse = {
  commitmentId: string;
  message: string;
  status: "queued";
};

export type FinalizationSweepResponse = {
  failed: number;
  finalized: number;
  scanned: number;
  status: "ok";
  timestamp: string;
};
