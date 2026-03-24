/**
 * This file stores Zod schemas for commitment-related endpoints.
 * It exists to keep HTTP payload validation close to the persistence-backed commitment domain.
 * It fits the system by making metadata persistence, evidence uploads, verification and appeal inputs explicit.
 */
import { z } from "zod";

const walletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const txHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);
const uintStringSchema = z
  .string()
  .regex(/^[0-9]+$/)
  .refine((value) => BigInt(value) >= 0n, "Value must be a valid unsigned integer.");

/**
 * This schema validates the request body used to persist a commitment created on-chain by the frontend.
 * It receives untrusted HTTP input.
 * It returns a typed payload when validation succeeds.
 * It is important because the backend now persists metadata after validating the corresponding on-chain commitment.
 */
export const createCommitmentBodySchema = z.object({
  amount: uintStringSchema.refine((value) => BigInt(value) > 0n, "Amount must be greater than zero."),
  createCommitmentTxHash: txHashSchema.optional(),
  deadline: z.string().datetime(),
  description: z.string().min(3).max(5_000),
  failReceiver: walletAddressSchema,
  onchainId: uintStringSchema.refine((value) => BigInt(value) > 0n, "onchainId must be greater than zero."),
  title: z.string().min(3).max(120)
});

/**
 * This schema validates the route params used to reference a commitment by off-chain UUID.
 * It receives untrusted HTTP input.
 * It returns a typed params object when validation succeeds.
 * It is important because all mutable commitment operations should target a stable UUID key.
 */
export const commitmentIdParamsSchema = z.object({
  id: z.string().uuid()
});

/**
 * This schema validates the multipart text fields accepted by the evidence endpoint.
 * It receives untrusted form-data text values after multer has parsed the request.
 * It returns a typed object containing the optional written evidence field.
 * It is important because evidence submissions can now include written proof without a file upload.
 */
export const uploadEvidenceBodySchema = z.object({
  textEvidence: z.string().max(10_000).optional()
});

/**
 * This schema validates the route params used to fetch commitments by wallet.
 * It receives untrusted HTTP input.
 * It returns a typed params object when validation succeeds.
 * It is important because the listing route should only accept valid EVM addresses.
 */
export const walletParamsSchema = z.object({
  wallet: walletAddressSchema
});

/**
 * This schema validates the request body used to request commitment verification.
 * It receives untrusted HTTP input.
 * It returns an empty typed object when validation succeeds.
 * It is important because even empty-body endpoints should validate their shape consistently.
 */
export const verifyCommitmentBodySchema = z.object({});

/**
 * This schema validates the request body used to record an appeal already submitted on-chain by the user.
 * It receives untrusted HTTP input.
 * It returns a typed appeal payload when validation succeeds.
 * It is important because the backend should store the appeal only after a valid on-chain appeal exists.
 */
export const appealBodySchema = z.object({
  appealTxHash: txHashSchema.optional()
});

/**
 * This schema validates the request body used to trigger internal appeal resolution.
 * It receives untrusted HTTP input.
 * It returns an empty typed object when validation succeeds.
 * It is important because internal operator routes should still follow the same validation discipline as public routes.
 */
export const resolveAppealBodySchema = z.object({});

/**
 * This schema validates the request body used to trigger internal failed-finalization.
 * It receives untrusted HTTP input.
 * It returns an empty typed object when validation succeeds.
 * It is important because manual finalization routes should be explicit and consistent with other internal actions.
 */
export const finalizeFailedBodySchema = z.object({});
