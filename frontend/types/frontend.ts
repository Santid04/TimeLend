/**
 * This file declares the frontend view models and API contracts used by the demo UI.
 * It exists to keep component props and backend payload handling explicit.
 * It fits the system by making the demo dashboard easy to evolve without scattering shape assumptions.
 */
export type CommitmentStatus = "ACTIVE" | "FAILED_PENDING_APPEAL" | "COMPLETED" | "FAILED_FINAL";

export type WalletChallengeResponse = {
  message: string;
  nonce: string;
  walletAddress: string;
};

export type WalletVerificationResponse = {
  token: string;
  walletAddress: string;
};

export type WalletSession = {
  token: string;
  walletAddress: string;
};

export type AcceptedJobResponse = {
  commitmentId: string;
  message: string;
  status: "queued";
};

export type ApiEvidence = {
  createdAt: string;
  extractedText: string;
  fileSize: number | null;
  fileUrl: string | null;
  id: string;
  mimeType: string | null;
  originalFileName: string | null;
  storedFileName: string | null;
  submittedText: string | null;
};

export type ApiVerification = {
  confidence: number;
  createdAt: string;
  evidenceId: string | null;
  id: string;
  model: string;
  provider: string;
  reasoning: string;
  result: boolean;
  type: string;
};

export type ApiCommitmentEvent = {
  createdAt: string;
  fromStatus: string | null;
  id: string;
  metadata: Record<string, unknown> | null;
  toStatus: string | null;
  txHash: string | null;
  type: string;
};

export type ApiCommitment = {
  amount: string;
  appealWindowEndsAt: string | null;
  appealed: boolean;
  completedAt: string | null;
  createCommitmentTxHash: string | null;
  createdAt: string;
  deadline: string;
  description: string;
  events: ApiCommitmentEvent[];
  evidences: ApiEvidence[];
  failedFinalAt: string | null;
  failReceiver: string;
  failureMarkedAt: string | null;
  finalizeFailedTxHash: string | null;
  id: string;
  isProcessing: boolean;
  markCompletedTxHash: string | null;
  markFailedTxHash: string | null;
  onchainId: string;
  processingStartedAt: string | null;
  resolveAppealTxHash: string | null;
  status: CommitmentStatus;
  title: string;
  updatedAt: string;
  userWalletAddress: string;
  verifications: ApiVerification[];
};

export type CommitmentsResponse = {
  items: ApiCommitment[];
};

export type CreateCommitmentPayload = {
  amount: string;
  createCommitmentTxHash?: string;
  deadline: string;
  description: string;
  failReceiver: string;
  onchainId: string;
  title: string;
};

export type CreateCommitmentFormValues = {
  amountAvax: string;
  deadlineDate: string;
  description: string;
  failReceiver: string;
  title: string;
  useWebOwnerWallet: boolean;
};

export type EvidenceSubmissionInput = {
  file: File | null;
  textEvidence: string;
};

export type DemoActionResult = {
  message: string;
};
