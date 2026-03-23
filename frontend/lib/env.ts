/**
 * This file validates the frontend runtime environment.
 * It exists to keep public configuration explicit and typed.
 * It fits the system by preventing silent drift between local and deployed frontend environments.
 */
import { z } from "zod";

const frontendEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .min(1)
    .default("http://localhost:4000")
});

/**
 * This function reads and validates the frontend runtime configuration.
 * It receives no parameters because values come from the process environment.
 * It returns a typed object with the public frontend variables.
 * It is important because future frontend features will depend on a stable env contract.
 */
export function getFrontendRuntimeConfig() {
  return frontendEnvSchema.parse({
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"
  });
}
