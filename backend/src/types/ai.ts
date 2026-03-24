/**
 * This file stores the AI verification result contracts used by the backend.
 * It exists to keep the Gemini and mock providers behind one consistent interface.
 * It fits the system by making verification flows deterministic for controllers and persistence logic.
 */
export type AiVerificationDecision = {
  confidence: number;
  rawResponse: Record<string, unknown>;
  reasoning: string;
  success: boolean;
};

export type VerificationContext = {
  description: string;
  evidenceText: string;
  fileEvidenceText?: string;
  previousReasoning?: string;
  title: string;
  writtenEvidenceText?: string;
};
