/**
 * This file stores the initial shared Zod schemas for commitment payloads.
 * It exists to create one reusable validation layer for future frontend forms and backend endpoints.
 * It fits the system by ensuring input contracts evolve in one place instead of many.
 */
import { z } from "zod";

import { CommitmentStatus } from "../enums/commitment-status.enum";

const walletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Expected an EVM wallet address.");

/**
 * This schema validates the payload for commitment creation.
 * It receives untrusted input from frontend forms or API clients.
 * It returns a parsed and typed object when validation succeeds.
 * It is important because commitment creation is the main write path of the product.
 */
export const createCommitmentSchema = z.object({
  amount: z.string().min(1),
  deadline: z.string().datetime(),
  description: z.string().min(3).max(5_000),
  failReceiver: walletAddressSchema,
  title: z.string().min(3).max(120)
});

/**
 * This schema validates the payload for evidence submission.
 * It receives untrusted input from frontend forms or API clients.
 * It returns a parsed and typed object when validation succeeds.
 * It is important because evidence is the bridge between user claims and AI verification.
 */
export const submitEvidenceSchema = z
  .object({
    commitmentId: z.string().min(1),
    evidenceReference: z.string().min(1).optional(),
    notes: z.string().max(2_000).optional(),
    textEvidence: z.string().max(10_000).optional()
  })
  .refine(
    (value) =>
      (value.evidenceReference !== undefined && value.evidenceReference.length > 0) ||
      (value.textEvidence !== undefined && value.textEvidence.trim().length > 0),
    {
      message: "Provide an evidence reference, written evidence, or both."
    }
  );

/**
 * This schema validates a commitment status value transported across services.
 * It receives a raw input value.
 * It returns a typed enum member when validation succeeds.
 * It is important because the lifecycle state must stay aligned across layers.
 */
export const commitmentStatusSchema = z.nativeEnum(CommitmentStatus);
