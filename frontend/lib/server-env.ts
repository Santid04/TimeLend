/**
 * This file validates the server-only runtime configuration used by Next route handlers.
 * It exists to protect internal demo actions without exposing backend secrets to the browser.
 * It fits the system by letting the frontend proxy internal backend routes safely during local demos.
 */
import { z } from "zod";

const serverEnvSchema = z.object({
  API_URL: z.string().url(),
  INTERNAL_API_KEY: z.string().min(1),
});

/**
 * This function reads and validates the server-side environment variables used by internal demo routes.
 * It receives no parameters because values come from process environment on the Next.js server runtime.
 * It returns the typed server-only config.
 * It is important because resolve-appeal and finalize-failed must never require exposing the internal backend key to the browser.
 */
export function getFrontendServerConfig() {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:4000/api";

  return serverEnvSchema.parse({
    API_URL: apiUrl.replace(/\/+$/, ""),
    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
  });
}
