/**
 * This file validates and exposes backend environment variables.
 * It exists to stop configuration mistakes early during boot.
 * It fits the system by creating one stable contract for local development, Vercel and future integrations.
 */
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const backendEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_NAME: z.string().min(1).default("TimeLend API"),
  API_VERSION: z.string().min(1).default("v1"),
  FRONTEND_APP_URL: z.string().min(1).default("http://localhost:3000"),
  DATABASE_URL: z.string().optional(),
  SYSTEM_WALLET_PRIVATE_KEY: z.string().optional(),
  AI_PROVIDER_API_KEY: z.string().optional(),
  EVIDENCE_STORAGE_BUCKET: z.string().optional(),
  RPC_URL: z.string().optional()
});

/**
 * This constant stores the parsed backend environment configuration.
 * It receives its input from process.env through the schema above.
 * It returns a typed environment object.
 * It is important because every infrastructure dependency will hang from this contract.
 */
export const env = backendEnvSchema.parse(process.env);
