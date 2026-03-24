/**
 * This file defines the shared commitment status enum used across packages.
 * It exists to avoid status strings drifting between frontend, backend and persistence layers.
 * It fits the system by providing a portable lifecycle vocabulary for the domain.
 */
export enum CommitmentStatus {
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  FAILED_FINAL = "FAILED_FINAL",
  FAILED_PENDING_APPEAL = "FAILED_PENDING_APPEAL"
}
