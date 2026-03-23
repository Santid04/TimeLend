/**
 * This file defines the shared commitment status enum used across packages.
 * It exists to avoid status strings drifting between frontend, backend and persistence layers.
 * It fits the system by providing a portable lifecycle vocabulary for the domain.
 */
export enum CommitmentStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  EVIDENCE_PENDING = "EVIDENCE_PENDING",
  UNDER_REVIEW = "UNDER_REVIEW",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  APPEALED = "APPEALED"
}
