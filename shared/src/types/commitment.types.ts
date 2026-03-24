/**
 * This file declares the shared domain types related to commitments.
 * It exists to define the base off-chain commitment shape before the full model is implemented.
 * It fits the system by giving all layers a consistent placeholder contract for the core entity.
 */
import type { CommitmentStatus } from "../enums/commitment-status.enum";

export type EvidenceRecord = {
  createdAt: string;
  extractedText: string;
  fileSize?: number | null;
  fileUrl?: string | null;
  id: string;
  mimeType?: string | null;
  originalFileName?: string | null;
  storedFileName?: string | null;
  submittedText?: string | null;
};

export type CommitmentRecord = {
  amount: string;
  createdAt: string;
  deadline: string;
  description: string;
  evidences?: EvidenceRecord[];
  failReceiver: string;
  id: string;
  status: CommitmentStatus;
  title: string;
  userId: string;
};
