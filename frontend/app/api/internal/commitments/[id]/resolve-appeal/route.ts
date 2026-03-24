/**
 * This file proxies the demo-only resolve-appeal action from Next.js to the backend.
 * It exists to keep the internal backend API key on the server side instead of exposing it to the browser.
 * It fits the system by letting the frontend demo exercise privileged backend routes safely during local testing.
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
 * This function forwards one resolve-appeal request to the backend using the internal API key.
 * It receives the Next.js route params containing the off-chain commitment id.
 * It returns the backend response body and status code as-is when possible.
 * It is important because the demo browser must not know the internal backend secret.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = paramsSchema.parse(await context.params);
    const serverConfig = getFrontendServerConfig();
    const response = await fetch(
      `${serverConfig.API_URL}/commitments/${params.id}/resolve-appeal`,
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
            : "Unable to reach the backend appeal resolution endpoint."
      },
      {
        status: 500
      }
    );
  }
}
