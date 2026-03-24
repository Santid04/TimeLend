/**
 * This file validates the public runtime configuration used by the frontend demo.
 * It exists to keep browser-visible environment variables explicit and typed.
 * It fits the system by making wallet, contract and backend integrations depend on one stable config contract.
 */
import { z } from "zod";

const frontendEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000/api"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("TimeLend Demo"),
  NEXT_PUBLIC_CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .default("0xA9b37103aBBE51f04D78751Fe3F4c6286306f595"),
  NEXT_PUBLIC_SYSTEM_FAIL_RECEIVER: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .default("0xC6C9237FbBC370A898366615eAFcBf0a57Bc72a0"),
  NEXT_PUBLIC_RPC_URL: z.string().url().default("https://api.avax-test.network/ext/bc/C/rpc"),
});

/**
 * This function reads and validates the browser-visible frontend configuration.
 * It receives no parameters because the values come from public Next.js environment variables.
 * It returns the typed runtime config used by hooks, services and components.
 * It is important because the demo frontend must fail early if contract or API addresses are misconfigured.
 */
export function getFrontendRuntimeConfig() {
  return frontendEnvSchema.parse({
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      "http://localhost:4000/api",
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? "TimeLend Demo",
    NEXT_PUBLIC_CONTRACT_ADDRESS:
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "0xA9b37103aBBE51f04D78751Fe3F4c6286306f595",
    NEXT_PUBLIC_SYSTEM_FAIL_RECEIVER:
      process.env.NEXT_PUBLIC_SYSTEM_FAIL_RECEIVER ?? "0xC6C9237FbBC370A898366615eAFcBf0a57Bc72a0",
    NEXT_PUBLIC_RPC_URL:
      process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc",
  });
}
