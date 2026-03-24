/**
 * This file validates and exposes backend environment variables.
 * It exists to stop misconfiguration early and keep infrastructure wiring explicit.
 * It fits the system by centralizing the runtime contract used by auth, uploads, AI, Prisma and blockchain services.
 */
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const backendEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_NAME: z.string().min(1).default("TimeLend API"),
  API_VERSION: z.string().min(1).default("v1"),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  FRONTEND_APP_URL: z.string().min(1).default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  PRIVATE_KEY: z.string().min(1),
  RPC_URL: z.string().url(),
  TIME_LEND_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().min(1).default("12h"),
  AUTH_CHALLENGE_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  UPLOAD_DIR: z.string().min(1).default("storage/uploads"),
  MAX_UPLOAD_SIZE_BYTES: z.coerce.number().int().positive().default(5_242_880),
  AVALANCHE_CHAIN_ID: z.coerce.number().int().positive().default(43_113),
  INTERNAL_API_KEY: z.string().min(16),
  FAILED_FINALIZATION_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
});

/**
 * This constant stores the parsed backend environment configuration.
 * It receives its input from process.env through the schema above.
 * It returns a typed environment object.
 * It is important because every infrastructure dependency hangs from this contract.
 */
export const env = backendEnvSchema.parse(process.env);
