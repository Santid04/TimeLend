/**
 * This file centralizes every browser-to-backend request used by the demo frontend.
 * It exists to keep fetch logic and error normalization away from React components.
 * It fits the system by making API integration auditable and easy to replace later.
 */
import { getFrontendRuntimeConfig } from "@/lib/env";
import type {
  AcceptedJobResponse,
  ApiCommitment,
  CommitmentsResponse,
  CreateCommitmentPayload,
  EvidenceSubmissionInput,
  WalletChallengeResponse,
  WalletVerificationResponse,
} from "@/types/frontend";

type RequestOptions = {
  body?: BodyInit | null;
  headers?: HeadersInit;
  method?: "GET" | "POST";
  token?: string;
};

/**
 * This function joins a configured API base URL with a route path safely.
 * It receives the base URL from environment configuration and the route path used by the caller.
 * It returns the normalized absolute request URL.
 * It is important because Vercel environment values may or may not include a trailing slash.
 */
function buildRequestUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

/**
 * This function parses a JSON response body when possible without throwing syntax errors to the UI layer.
 * It receives the raw response text returned by fetch.
 * It returns the parsed object or null when the body is empty or not valid JSON.
 * It is important because production errors may come from proxies or gateways that do not always return JSON.
 */
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
 * This function executes one frontend API request and normalizes error responses.
 * It receives the target path plus method, headers, body and optional bearer token.
 * It returns the parsed JSON payload expected by the caller.
 * It is important because the demo UI should surface backend errors consistently instead of duplicating fetch code everywhere.
 */
async function requestJson<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const runtimeConfig = getFrontendRuntimeConfig();
  const requestInit: RequestInit = {
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.token === undefined ? {} : { Authorization: `Bearer ${options.token}` }),
      ...options.headers,
    },
    method: options.method ?? "GET",
  };

  if (options.body !== undefined) {
    requestInit.body = options.body;
  }

  const response = await fetch(
    buildRequestUrl(runtimeConfig.NEXT_PUBLIC_API_URL, path),
    requestInit,
  );

  const responseText = await response.text();
  const parsedBody = parseJsonBody(responseText);

  if (!response.ok) {
    const message =
      typeof parsedBody?.message === "string"
        ? parsedBody.message
        : responseText.length > 0
          ? responseText
          : `Request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return parsedBody as TResponse;
}

/**
 * This function executes one same-origin request against the Next.js frontend runtime.
 * It receives the relative path plus method, headers, body and optional bearer token.
 * It returns the parsed JSON payload expected by the caller.
 * It is important because internal demo proxy routes must be called on the frontend origin, not the backend API origin.
 */
async function requestFrontendJson<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const requestInit: RequestInit = {
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.token === undefined ? {} : { Authorization: `Bearer ${options.token}` }),
      ...options.headers,
    },
    method: options.method ?? "GET",
  };

  if (options.body !== undefined) {
    requestInit.body = options.body;
  }

  const response = await fetch(path, requestInit);
  const responseText = await response.text();
  const parsedBody = parseJsonBody(responseText);

  if (!response.ok) {
    const message =
      typeof parsedBody?.message === "string"
        ? parsedBody.message
        : responseText.length > 0
          ? responseText
          : `Request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return parsedBody as TResponse;
}

/**
 * This function requests a fresh backend wallet-auth challenge for the connected wallet.
 * It receives the wallet address that wants to authenticate.
 * It returns the challenge payload that must be signed by the wallet.
 * It is important because all protected backend routes require a JWT issued from this flow.
 */
export function createWalletChallenge(walletAddress: string) {
  return requestJson<WalletChallengeResponse>("/auth/challenge", {
    body: JSON.stringify({ walletAddress }),
    method: "POST",
  });
}

/**
 * This function verifies a signed wallet challenge and retrieves the frontend session token.
 * It receives the wallet address and the generated signature.
 * It returns the backend-issued JWT payload.
 * It is important because the demo must authenticate before it can list or mutate commitments.
 */
export function verifyWalletSignature(walletAddress: string, signature: string) {
  return requestJson<WalletVerificationResponse>("/auth/verify-signature", {
    body: JSON.stringify({ signature, walletAddress }),
    method: "POST",
  });
}

/**
 * This function persists a newly created on-chain commitment in the backend database.
 * It receives the JWT plus the synchronized commitment payload.
 * It returns the stored commitment aggregate.
 * It is important because the backend owns metadata, evidence, AI history and logical status.
 */
export function createCommitmentRecord(token: string, payload: CreateCommitmentPayload) {
  return requestJson<ApiCommitment>("/commitments", {
    body: JSON.stringify(payload),
    method: "POST",
    token,
  });
}

/**
 * This function fetches the current commitment dashboard for one authenticated wallet.
 * It receives the JWT and the wallet address used in the route.
 * It returns the list of commitments known by the backend for that wallet.
 * It is important because the frontend polls this endpoint to reflect async verification progress.
 */
export async function listCommitments(token: string, walletAddress: string) {
  const response = await requestJson<CommitmentsResponse>(`/commitments/${walletAddress}`, {
    method: "GET",
    token,
  });

  return response.items;
}

/**
 * This function submits one evidence payload for a given commitment.
 * It receives the JWT, the target commitment id, an optional file and optional written evidence.
 * It returns the updated commitment aggregate from the backend.
 * It is important because the verify flow now accepts file evidence, written evidence or both.
 */
export function uploadEvidence(
  token: string,
  commitmentId: string,
  input: EvidenceSubmissionInput,
) {
  const formData = new FormData();
  const trimmedTextEvidence = input.textEvidence.trim();

  if (input.file !== null) {
    formData.append("file", input.file);
  }

  if (trimmedTextEvidence.length > 0) {
    formData.append("textEvidence", trimmedTextEvidence);
  }

  return requestJson<{ commitment: ApiCommitment }>(`/commitments/${commitmentId}/evidence`, {
    body: formData,
    method: "POST",
    token,
  });
}

/**
 * This function enqueues backend verification for a commitment.
 * It receives the JWT and the target commitment id.
 * It returns the accepted-job payload from the backend.
 * It is important because verification is asynchronous and the UI must react to the queue response.
 */
export function verifyCommitmentRequest(token: string, commitmentId: string) {
  return requestJson<AcceptedJobResponse>(`/commitments/${commitmentId}/verify`, {
    body: JSON.stringify({}),
    method: "POST",
    token,
  });
}

/**
 * This function records an already-submitted appeal in the backend database.
 * It receives the JWT, the target commitment id and the optional on-chain appeal tx hash.
 * It returns the updated commitment aggregate.
 * It is important because the backend only resolves appeals that were first consumed on-chain by the user.
 */
export function recordAppeal(token: string, commitmentId: string, appealTxHash?: string) {
  return requestJson<ApiCommitment>(`/commitments/${commitmentId}/appeal`, {
    body: JSON.stringify({
      ...(appealTxHash === undefined ? {} : { appealTxHash }),
    }),
    method: "POST",
    token,
  });
}

/**
 * This function calls the frontend's internal demo proxy that triggers backend appeal resolution.
 * It receives the off-chain commitment id.
 * It returns the accepted-job payload.
 * It is important because the browser should not hold the internal backend API key directly.
 */
export function resolveAppealDemo(commitmentId: string) {
  return requestFrontendJson<AcceptedJobResponse>(
    `/api/internal/commitments/${commitmentId}/resolve-appeal`,
    {
      body: JSON.stringify({}),
      method: "POST",
    },
  );
}

/**
 * This function calls the frontend's internal demo proxy that triggers backend failed finalization.
 * It receives the off-chain commitment id.
 * It returns the updated commitment aggregate from the backend.
 * It is important because finalizing failed commitments is an internal-only backend action in the current architecture.
 */
export function finalizeFailedDemo(commitmentId: string) {
  return requestFrontendJson<ApiCommitment>(
    `/api/internal/commitments/${commitmentId}/finalize-failed`,
    {
      body: JSON.stringify({}),
      method: "POST",
    },
  );
}
