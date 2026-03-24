/**
 * This file registers the commitment, evidence and appeal routes for the backend.
 * It exists to keep route wiring close to validation, auth and upload middleware composition.
 * It fits the system by making the commitment lifecycle visible as one cohesive API module.
 */
import { Router } from "express";
import type { Router as ExpressRouter, RequestHandler } from "express";

import type { CommitmentController } from "../controllers/commitment.controller";
import { upload } from "../middlewares/upload";
import { validateCompositeRequest, validateRequest } from "../middlewares/validate";
import {
  appealBodySchema,
  commitmentIdParamsSchema,
  createCommitmentBodySchema,
  finalizeFailedBodySchema,
  uploadEvidenceBodySchema,
  resolveAppealBodySchema,
  verifyCommitmentBodySchema,
  walletParamsSchema
} from "../schemas/commitment.schemas";
import { asyncHandler } from "../utils/async-handler";

type CommitmentRouterDependencies = {
  authenticate: RequestHandler;
  commitmentController: CommitmentController;
  requireInternal: RequestHandler;
};

/**
 * This function creates the router for commitment lifecycle endpoints.
 * It receives the controller plus auth middlewares needed by public and internal routes.
 * It returns an Express router ready to mount under the commitments prefix.
 * It is important because user-authenticated and internal-only actions must coexist without mixing trust boundaries.
 */
export function createCommitmentRouter(
  dependencies: CommitmentRouterDependencies
): ExpressRouter {
  const router = Router();

  router.post(
    "/:id/resolve-appeal",
    dependencies.requireInternal,
    validateCompositeRequest({
      body: resolveAppealBodySchema,
      params: commitmentIdParamsSchema
    }),
    asyncHandler(dependencies.commitmentController.resolveAppeal)
  );
  router.post(
    "/:id/finalize-failed",
    dependencies.requireInternal,
    validateCompositeRequest({
      body: finalizeFailedBodySchema,
      params: commitmentIdParamsSchema
    }),
    asyncHandler(dependencies.commitmentController.finalizeFailed)
  );
  router.post(
    "/:id/finalize",
    dependencies.requireInternal,
    validateCompositeRequest({
      body: finalizeFailedBodySchema,
      params: commitmentIdParamsSchema
    }),
    asyncHandler(dependencies.commitmentController.finalizeFailed)
  );

  router.use(dependencies.authenticate);

  router.post(
    "/",
    validateRequest(createCommitmentBodySchema, "body"),
    asyncHandler(dependencies.commitmentController.createCommitment)
  );
  router.post(
    "/:id/evidence",
    validateRequest(commitmentIdParamsSchema, "params"),
    upload.single("file"),
    validateRequest(uploadEvidenceBodySchema, "body"),
    asyncHandler(dependencies.commitmentController.uploadEvidence)
  );
  router.post(
    "/:id/verify",
    validateCompositeRequest({
      body: verifyCommitmentBodySchema,
      params: commitmentIdParamsSchema
    }),
    asyncHandler(dependencies.commitmentController.verifyCommitment)
  );
  router.post(
    "/:id/appeal",
    validateCompositeRequest({
      body: appealBodySchema,
      params: commitmentIdParamsSchema
    }),
    asyncHandler(dependencies.commitmentController.requestAppeal)
  );
  router.get(
    "/:wallet",
    validateRequest(walletParamsSchema, "params"),
    asyncHandler(dependencies.commitmentController.listCommitments)
  );

  return router;
}
