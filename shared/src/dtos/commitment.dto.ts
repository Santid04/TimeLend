/**
 * This file defines the initial DTOs for commitment creation and resolution flows.
 * It exists to keep transport-layer payloads explicit before the final business logic is implemented.
 * It fits the system by giving API and frontend work a stable placeholder contract to build on.
 */
export type CreateCommitmentDto = {
  amount: string;
  deadlineAt: string;
  description?: string;
  failureWalletAddress: string;
  title: string;
};

export type SubmitEvidenceDto = {
  commitmentId: string;
  evidenceReference: string;
  notes?: string;
};
