/**
 * This file declares shared API-level payload types.
 * It exists to give future frontend and backend integration a portable contract surface.
 * It fits the system by reducing duplication of simple system payloads across layers.
 */
export type HealthDto = {
  environment: string;
  service: string;
  status: "ok";
  timestamp: string;
};

export type VersionDto = {
  apiVersion: string;
  name: string;
  runtime: string;
  version: string;
};
