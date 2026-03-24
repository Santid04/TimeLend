/**
 * This file builds the reproducible prompts sent to the AI verifier.
 * It exists to keep prompt changes explicit and versioned instead of scattering strings across services.
 * It fits the system by making verification behavior easier to tune and audit over time.
 */
import type { VerificationContext } from "../types/ai";

/**
 * This constant identifies the current prompt version used for evidence verification.
 * It receives no runtime input and is loaded statically.
 * It returns the prompt version label.
 * It is important because stored verification records should always reference the exact prompt generation strategy.
 */
export const PROMPT_VERSION = "timelend-gemini-v1";

/**
 * This function builds the main verification prompt for Gemini.
 * It receives the commitment context and the verification stage.
 * It returns a deterministic instruction string for the model.
 * It is important because the AI decision must be reproducible enough for demos, debugging and appeal reviews.
 */
export function buildVerificationPrompt(
  context: VerificationContext,
  stage: "initial" | "appeal"
) {
  const strictnessNote =
    stage === "appeal"
      ? "This is an appeal review. Be stricter, consider previous doubts, and only approve if the evidence clearly supports completion."
      : "This is the initial review. Approve only when the evidence clearly supports that the commitment was completed.";

  return [
    "You are the verification engine for TimeLend.",
    "You must evaluate whether the provided evidence supports that the commitment was fulfilled.",
    strictnessNote,
    "Return a JSON object with: success (boolean), confidence (number from 0 to 1), reasoning (string).",
    "Do not include markdown. Do not add fields outside the requested JSON.",
    "",
    `Commitment title: ${context.title}`,
    `Commitment description: ${context.description}`,
    "",
    ...(context.fileEvidenceText !== undefined
      ? ["Uploaded file evidence text:", context.fileEvidenceText, ""]
      : context.writtenEvidenceText === undefined
        ? ["Evidence text:", context.evidenceText, ""]
        : []),
    ...(context.writtenEvidenceText !== undefined
      ? ["Written evidence provided by the user:", context.writtenEvidenceText, ""]
      : ["Written evidence provided by the user: none", ""]),
    context.previousReasoning !== undefined
      ? `Previous review reasoning: ${context.previousReasoning}`
      : "Previous review reasoning: none"
  ].join("\n");
}
