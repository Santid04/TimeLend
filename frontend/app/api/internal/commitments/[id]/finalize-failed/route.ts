/**
 * This file proxies the demo-only failed-finalization action from Next.js to the backend.
 * It exists to keep the internal backend API key server-side while still exposing the action in the demo UI.
 * It fits the system by letting operators test the full failure flow without weakening browser security.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { getFrontendServerConfig } from "@/lib/server-env";

const paramsSchema = z.object({
  id: z.string().uuid()
});

function parseJsonBody(responseText: string) {
  if (responseText.length === 0) {
    return null;
  }

  try {
    return JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * This function forwards one failed-finalization request to the backend using the internal API key.
 * It receives the Next.js route params containing the off-chain commitment id.
 * It returns the backend response body and status code as-is when possible.
 * It is important because the demo frontend needs an internal-only control path without exposing secrets in client code.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = paramsSchema.parse(await context.params);
    const serverConfig = getFrontendServerConfig();
    const response = await fetch(
      `${serverConfig.API_URL}/commitments/${params.id}/finalize-failed`,
      {
        body: JSON.stringify({}),
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": serverConfig.INTERNAL_API_KEY
        },
        method: "POST"
      }
    );

    const responseText = await response.text();
    const parsedPayload = parseJsonBody(responseText);
    const payload =
      parsedPayload ??
      (responseText.length > 0
        ? { message: responseText }
        : { message: `Backend request failed with status ${response.status}.` });

    return NextResponse.json(payload, {
      status: response.status
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to reach the backend failed finalization endpoint."
      },
      {
        status: 500
      }
    );
  }
}
