/**
 * This file implements the persistence-first TimeLend commitment orchestration service.
 * It exists to coordinate PostgreSQL state, evidence ingestion, AI verification, history events and privileged contract calls.
 * It fits the system by making the database the source of truth for product state while blockchain remains the source of truth for funds.
 */
import {
  CommitmentEventType,
  CommitmentStatus,
  VerificationType,
  prisma
} from "@timelend/database";
import type { Prisma } from "@timelend/database";
import type { Express } from "express";
import { getAddress } from "ethers";

import { env } from "../config/env";
import { logger } from "../config/logger";
import { InMemoryJobQueue } from "../jobs/in-memory-job-queue";
import type { AuthenticatedUserContext } from "../types/auth";
import type { AcceptedJobResponse } from "../types/http";
import type { VerificationJob } from "../types/jobs";
import { AppError } from "../utils/app-error";
import type { AiService } from "./ai.service";
import type { ContractService } from "./contract.service";
import type { EvidenceService } from "./evidence.service";

const UNCERTAIN_FAILURE_CONFIDENCE_THRESHOLD = 0.6;

const commitmentInclude = {
  events: {
    orderBy: {
      createdAt: "desc"
    }
  },
  evidences: {
    orderBy: {
      createdAt: "desc"
    }
  },
  user: true,
  verifications: {
    orderBy: {
      createdAt: "desc"
    }
  }
} satisfies Prisma.CommitmentInclude;

type CommitmentRecord = Prisma.CommitmentGetPayload<{
  include: typeof commitmentInclude;
}>;

type CreateCommitmentInput = {
  amount: string;
  createCommitmentTxHash?: string;
  deadline: string;
  description: string;
  failReceiver: string;
  onchainId: string;
  title: string;
};

type AppealInput = {
  appealTxHash?: string;
};

type PresentedEvidence = {
  createdAt: Date;
  extractedText: string;
  fileSize: number;
  fileUrl: string;
  id: string;
  mimeType: string;
  originalFileName: string;
  storedFileName: string;
};

type PresentedVerification = {
  confidence: number;
  createdAt: Date;
  evidenceId: string | null;
  id: string;
  model: string;
  provider: string;
  reasoning: string;
  result: boolean;
  type: string;
};

type PresentedEvent = {
  createdAt: Date;
  fromStatus: string | null;
  id: string;
  metadata: Prisma.JsonValue | null;
  toStatus: string | null;
  txHash: string | null;
  type: string;
};

type PresentedCommitment = {
  amount: string;
  appealWindowEndsAt: Date | null;
  appealed: boolean;
  completedAt: Date | null;
  createCommitmentTxHash: string | null;
  createdAt: Date;
  deadline: Date;
  description: string;
  events: PresentedEvent[];
  evidences: PresentedEvidence[];
  failedFinalAt: Date | null;
  failReceiver: string;
  failureMarkedAt: Date | null;
  finalizeFailedTxHash: string | null;
  id: string;
  isProcessing: boolean;
  markCompletedTxHash: string | null;
  markFailedTxHash: string | null;
  onchainId: string;
  processingStartedAt: Date | null;
  resolveAppealTxHash: string | null;
  status: string;
  title: string;
  updatedAt: Date;
  userWalletAddress: string;
  verifications: PresentedVerification[];
};

type EvidenceUploadResult = {
  commitment: PresentedCommitment;
  evidence: PresentedEvidence;
};

/**
 * This class coordinates the commitment lifecycle on top of the redesigned persistence layer.
 * It receives the AI, evidence and contract services as explicit dependencies.
 * It returns a reusable domain service instance.
 * It is important because blockchain state, verification state and product state must evolve together without ambiguity.
 */
export class CommitmentService {
  private maintenanceInterval: NodeJS.Timeout | null = null;

  /**
   * This queue serializes verification and appeal-resolution jobs that consume the backend signer.
   * It receives queued jobs from HTTP-triggered routes and processes them one at a time.
   * It returns no direct output because it is an internal concurrency primitive.
   * It is important because signer-backed on-chain operations should remain deterministic and easy to audit.
   */
  private readonly verificationQueue = new InMemoryJobQueue<VerificationJob>(
    logger.child({ queue: "verification" }),
    async (job) => {
      await this.processVerificationJob(job);
    },
    1
  );

  /**
   * This constructor wires the service to its infrastructure dependencies.
   * It receives the contract, AI and evidence services used by the lifecycle.
   * It returns a CommitmentService instance.
   * It is important because the HTTP layer should not know how persistence and blockchain orchestration are combined.
   */
  constructor(
    private readonly contractService: ContractService,
    private readonly aiService: AiService,
    private readonly evidenceService: EvidenceService
  ) {}

  /**
   * This function starts the maintenance loop that periodically finalizes expired failed commitments.
   * It receives no parameters because the interval comes from validated environment variables.
   * It returns nothing because the loop runs internally.
   * It is important because commitments that fail without appeal must not remain pending forever.
   */
  startMaintenanceLoop() {
    if (this.maintenanceInterval !== null) {
      return;
    }

    this.maintenanceInterval = setInterval(() => {
      void this.finalizeExpiredFailures();
    }, env.FAILED_FINALIZATION_INTERVAL_MS);

    this.maintenanceInterval.unref();
    void this.finalizeExpiredFailures();
  }

  /**
   * This function persists a commitment that was already created on-chain by the user.
   * It receives the authenticated wallet context and the metadata payload containing the on-chain id.
   * It returns the stored commitment aggregate.
   * It is important because the database should only persist commitments after validating the corresponding on-chain record.
   */
  async createCommitment(
    auth: AuthenticatedUserContext,
    input: CreateCommitmentInput
  ): Promise<PresentedCommitment> {
    const authenticatedUser = await this.getAuthenticatedUser(auth);
    const normalizedInput = this.normalizeCommitmentInput(input);
    const existingCommitment = await prisma.commitment.findUnique({
      include: commitmentInclude,
      where: {
        onchainId: normalizedInput.onchainId
      }
    });

    if (existingCommitment !== null) {
      if (existingCommitment.userId !== authenticatedUser.id) {
        throw new AppError(
          409,
          "COMMITMENT_ONCHAIN_ID_TAKEN",
          "This on-chain commitment is already linked to another user."
        );
      }

      return this.presentCommitment(existingCommitment);
    }

    const onChainCommitment = await this.contractService.getCommitmentOnChain(normalizedInput.onchainId);
    this.assertCreateInputMatchesOnChain(authenticatedUser.walletAddress, normalizedInput, onChainCommitment);

    const derivedStatus = this.mapOnChainStateToDatabaseStatus(
      onChainCommitment.status,
      onChainCommitment.payoutState
    );

    const createdCommitment = await prisma.commitment.create({
      data: {
        amount: normalizedInput.amount,
        appealWindowEndsAt: onChainCommitment.appealWindowEndsAt,
        appealed: onChainCommitment.appealed,
        createCommitmentTxHash: normalizedInput.createCommitmentTxHash ?? null,
        deadline: normalizedInput.deadline,
        description: normalizedInput.description,
        failReceiver: normalizedInput.failReceiver,
        failureMarkedAt: onChainCommitment.failureMarkedAt,
        onchainId: normalizedInput.onchainId,
        status: derivedStatus,
        title: normalizedInput.title,
        userId: authenticatedUser.id,
        events: {
          create: {
            metadata: {
              source: "frontend-onchain-sync"
            },
            toStatus: derivedStatus,
            txHash: normalizedInput.createCommitmentTxHash ?? null,
            type: CommitmentEventType.CREATED
          }
        }
      },
      include: commitmentInclude
    });

    logger.info(
      {
        commitmentId: createdCommitment.id,
        onchainId: createdCommitment.onchainId.toString(),
        walletAddress: authenticatedUser.walletAddress
      },
      "Commitment persisted from on-chain source"
    );

    return this.presentCommitment(createdCommitment);
  }

  /**
   * This function lists commitments for the authenticated wallet.
   * It receives the authenticated wallet context and the wallet address requested in the route.
   * It returns the sanitized commitment list for that wallet.
   * It is important because the dashboard should read one consistent aggregate from persistence.
   */
  async listCommitmentsForWallet(
    auth: AuthenticatedUserContext,
    walletAddress: string
  ): Promise<PresentedCommitment[]> {
    const normalizedWalletAddress = getAddress(walletAddress);

    if (normalizedWalletAddress !== getAddress(auth.walletAddress)) {
      throw new AppError(
        403,
        "COMMITMENT_FORBIDDEN",
        "You can only read commitments owned by the authenticated wallet."
      );
    }

    const authenticatedUser = await this.getAuthenticatedUser(auth);
    const commitments = await prisma.commitment.findMany({
      include: commitmentInclude,
      orderBy: {
        createdAt: "desc"
      },
      where: {
        userId: authenticatedUser.id
      }
    });

    return commitments.map((commitment) => this.presentCommitment(commitment));
  }

  /**
   * This function ingests an uploaded evidence file and stores it against the commitment.
   * It receives the authenticated wallet context, the off-chain commitment id and the uploaded file metadata.
   * It returns the updated commitment plus the stored evidence row.
   * It is important because every later verification and appeal depends on this persisted evidence history.
   */
  async uploadEvidence(
    auth: AuthenticatedUserContext,
    commitmentId: string,
    file: Express.Multer.File | undefined
  ): Promise<EvidenceUploadResult> {
    if (file === undefined) {
      throw new AppError(400, "EVIDENCE_FILE_MISSING", "An evidence file is required.");
    }

    const commitment = await this.getOwnedCommitment(commitmentId, auth.userId);

    if (!this.canUploadEvidence(commitment.status, commitment.isProcessing)) {
      throw new AppError(
        409,
        "EVIDENCE_UPLOAD_NOT_ALLOWED",
        "Evidence cannot be uploaded in the current commitment state."
      );
    }

    try {
      const extractedEvidence = await this.evidenceService.ingestUploadedFile(file);
      const fileUrl = this.buildFileUrl(extractedEvidence.storedFileName);

      const [evidence, updatedCommitment] = await prisma.$transaction([
        prisma.evidence.create({
          data: {
            commitmentId: commitment.id,
            extractedText: extractedEvidence.extractedText,
            fileSize: extractedEvidence.fileSize,
            fileUrl,
            mimeType: extractedEvidence.mimeType,
            originalFileName: extractedEvidence.originalFileName,
            storedFileName: extractedEvidence.storedFileName,
            uploadedByUserId: auth.userId
          }
        }),
        prisma.commitment.update({
          data: {
            events: {
              create: {
                metadata: {
                  fileUrl,
                  mimeType: extractedEvidence.mimeType
                },
                type: CommitmentEventType.EVIDENCE_ADDED
              }
            }
          },
          include: commitmentInclude,
          where: {
            id: commitment.id
          }
        })
      ]);

      logger.info(
        {
          commitmentId: commitment.id,
          evidenceId: evidence.id
        },
        "Evidence stored successfully"
      );

      return {
        commitment: this.presentCommitment(updatedCommitment),
        evidence: this.presentEvidence(evidence)
      };
    } catch (error) {
      await this.evidenceService.removeStoredFile(file.path);
      throw error;
    }
  }

  /**
   * This function enqueues the initial verification workflow for a commitment.
   * It receives the authenticated wallet context and the off-chain commitment id.
   * It returns an accepted-job response.
   * It is important because the backend must make verification idempotent and non-blocking.
   */
  async verifyCommitment(
    auth: AuthenticatedUserContext,
    commitmentId: string
  ): Promise<AcceptedJobResponse> {
    const commitment = await this.getOwnedCommitment(commitmentId, auth.userId);

    if (commitment.isProcessing) {
      return {
        commitmentId: commitment.id,
        message: "Verification is already in progress for this commitment.",
        status: "queued"
      };
    }

    if (commitment.status !== CommitmentStatus.ACTIVE) {
      return {
        commitmentId: commitment.id,
        message: "Verification was skipped because this commitment is no longer active.",
        status: "queued"
      };
    }

    this.getLatestEvidence(commitment);

    await this.acquireProcessingLock(commitment.id, [CommitmentStatus.ACTIVE]);
    try {
      await this.appendEvent(commitment.id, {
        metadata: {
          verificationType: VerificationType.INITIAL
        },
        type: CommitmentEventType.VERIFICATION_STARTED
      });
      this.verificationQueue.enqueue({
        commitmentId: commitment.id,
        type: "initial_verification"
      });
    } catch (error) {
      await this.releaseProcessingLockSafely(commitment.id, "verifyCommitment.enqueue");
      throw error;
    }

    return {
      commitmentId: commitment.id,
      message: "Initial verification queued.",
      status: "queued"
    };
  }

  /**
   * This function records that the user has already requested the on-chain appeal.
   * It receives the authenticated wallet context, the off-chain commitment id and optional appeal metadata.
   * It returns the updated commitment aggregate.
   * It is important because the product state must explicitly remember that the single appeal path was consumed.
   */
  async recordAppeal(
    auth: AuthenticatedUserContext,
    commitmentId: string,
    input: AppealInput
  ): Promise<PresentedCommitment> {
    const commitment = await this.getOwnedCommitment(commitmentId, auth.userId);

    if (commitment.status !== CommitmentStatus.FAILED_PENDING_APPEAL) {
      throw new AppError(
        409,
        "APPEAL_NOT_ALLOWED",
        "Only failed commitments pending appeal can record an appeal."
      );
    }

    if (commitment.isProcessing) {
      throw new AppError(
        409,
        "APPEAL_RECORDING_BLOCKED",
        "This commitment is currently being processed and cannot record an appeal yet."
      );
    }

    if (commitment.appealed) {
      throw new AppError(409, "APPEAL_ALREADY_RECORDED", "This commitment already recorded an appeal.");
    }

    const latestInitialVerification = this.getLatestInitialVerification(commitment);

    if (!this.isAppealAllowedForFailedVerification(latestInitialVerification.confidence)) {
      throw new AppError(
        409,
        "APPEAL_NOT_ALLOWED",
        "Appeals are only available for uncertain failed verifications."
      );
    }

    if (!this.hasNewEvidenceForAppeal(commitment, latestInitialVerification)) {
      throw new AppError(
        409,
        "APPEAL_REQUIRES_NEW_EVIDENCE",
        "Upload new evidence before appealing this commitment."
      );
    }

    const onChainCommitment = await this.contractService.getCommitmentOnChain(commitment.onchainId);

    if (onChainCommitment.status !== 2 || !onChainCommitment.appealed) {
      throw new AppError(
        409,
        "APPEAL_NOT_FOUND_ONCHAIN",
        "The on-chain appeal has not been registered yet for this commitment."
      );
    }

    const updatedCommitment = await prisma.commitment.update({
      data: {
        appealWindowEndsAt: onChainCommitment.appealWindowEndsAt,
        appealed: true,
        events: {
          create: {
            metadata: {
              source: "frontend-onchain-appeal-sync"
            },
            txHash: input.appealTxHash ?? null,
            type: CommitmentEventType.APPEAL_RECORDED
          }
        }
      },
      include: commitmentInclude,
      where: {
        id: commitment.id
      }
    });

    return this.presentCommitment(updatedCommitment);
  }

  /**
   * This function enqueues the internal appeal-resolution workflow.
   * It receives the off-chain commitment id.
   * It returns an accepted-job response.
   * It is important because appeal resolution is a privileged backend-only operation.
   */
  async resolveAppeal(commitmentId: string): Promise<AcceptedJobResponse> {
    const commitment = await this.getCommitmentById(commitmentId);
    this.assertAppealResolutionEligibility(commitment);
    this.getLatestEvidence(commitment);
    this.assertAppealHasRequiredEvidence(commitment);

    await this.acquireProcessingLock(commitment.id, [CommitmentStatus.FAILED_PENDING_APPEAL]);
    try {
      await this.appendEvent(commitment.id, {
        metadata: {
          verificationType: VerificationType.APPEAL
        },
        type: CommitmentEventType.VERIFICATION_STARTED
      });
      this.verificationQueue.enqueue({
        commitmentId: commitment.id,
        type: "appeal_resolution"
      });
    } catch (error) {
      await this.releaseProcessingLockSafely(commitment.id, "resolveAppeal.enqueue");
      throw error;
    }

    return {
      commitmentId: commitment.id,
      message: "Appeal resolution queued.",
      status: "queued"
    };
  }

  /**
   * This function finalizes an unappealed failed commitment.
   * It receives the off-chain commitment id.
   * It returns the updated commitment aggregate after the on-chain finalization succeeds.
   * It is important because failed commitments must eventually reach a definitive FAILED_FINAL state.
   */
  async finalizeFailedCommitment(commitmentId: string): Promise<PresentedCommitment> {
    const commitment = await this.getCommitmentById(commitmentId);
    await this.assertFailedFinalizationEligibility(commitment);

    await this.acquireProcessingLock(commitment.id, [
      CommitmentStatus.FAILED_PENDING_APPEAL,
      CommitmentStatus.FAILED_FINAL
    ]);
    return this.runFailedFinalization(commitment.id);
  }

  /**
   * This function scans and finalizes failed commitments whose appeal window already expired.
   * It receives no parameters because the query is derived from persisted state.
   * It returns a promise that resolves after the current batch finishes.
   * It is important because background maintenance should keep failed commitments progressing to FAILED_FINAL.
   */
  async finalizeExpiredFailures() {
    const clearFailureReadyAt = await this.getClearFailureReadyAtCutoff();
    const expiredCommitments = await prisma.commitment.findMany({
      orderBy: {
        failureMarkedAt: "asc"
      },
      take: 25,
      where: {
        appealed: false,
        finalizeFailedTxHash: null,
        isProcessing: false,
        OR: [
          {
            appealWindowEndsAt: {
              lte: new Date()
            },
            status: CommitmentStatus.FAILED_PENDING_APPEAL
          },
          {
            failureMarkedAt: {
              lte: clearFailureReadyAt
            },
            status: CommitmentStatus.FAILED_FINAL
          }
        ]
      }
    });

    for (const commitment of expiredCommitments) {
      try {
        await this.acquireProcessingLock(commitment.id, [
          CommitmentStatus.FAILED_PENDING_APPEAL,
          CommitmentStatus.FAILED_FINAL
        ]);
        await this.runFailedFinalization(commitment.id);
      } catch (error) {
        logger.error(
          {
            commitmentId: commitment.id,
            error
          },
          "Failed to finalize expired commitment"
        );
      }
    }
  }

  /**
   * This function dispatches one queued verification job.
   * It receives the queued job payload.
   * It returns a promise that resolves after the selected workflow finishes.
   * It is important because the same queue is reused for initial verification and appeal resolution.
   */
  private async processVerificationJob(job: VerificationJob) {
    if (job.type === "initial_verification") {
      await this.processInitialVerification(job.commitmentId);
      return;
    }

    await this.processAppealResolution(job.commitmentId);
  }

  /**
   * This function runs the initial AI verification workflow and synchronizes the result with chain and DB.
   * It receives the off-chain commitment id from the queue.
   * It returns a promise that resolves after the full verification finishes.
   * It is important because this workflow decides whether funds return to the user or move into failed-pending-appeal.
   */
  private async processInitialVerification(commitmentId: string) {
    let lockedCommitmentId: string | null = null;
    try {
      const commitment = await this.getCommitmentById(commitmentId);
      lockedCommitmentId = commitment.id;

      if (commitment.status !== CommitmentStatus.ACTIVE || !commitment.isProcessing) {
        logger.warn(
          {
            commitmentId: commitment.id,
            isProcessing: commitment.isProcessing,
            status: commitment.status
          },
          "Skipped initial verification because the commitment left the expected state"
        );
        return;
      }

      const latestEvidence = this.getLatestEvidence(commitment);
      const decision = await this.aiService.verifyEvidence(
        this.buildVerificationContext(commitment, latestEvidence),
        "initial"
      );

      const verification = await prisma.verification.create({
        data: {
          commitmentId: commitment.id,
          confidence: decision.confidence,
          evidenceId: latestEvidence.id,
          model: env.GEMINI_API_KEY !== undefined ? env.GEMINI_MODEL : "mock-gemini-heuristic",
          provider: env.GEMINI_API_KEY !== undefined ? "google-genai" : "mock",
          rawResponse: decision.rawResponse as Prisma.InputJsonValue,
          reasoning: decision.reasoning,
          result: decision.success,
          type: VerificationType.INITIAL
        }
      });

      if (decision.success) {
        const resolution = await this.contractService.markCompletedOnChain(commitment.onchainId);

        await prisma.commitment.update({
          data: {
            completedAt: new Date(),
            isProcessing: false,
            markCompletedTxHash: resolution.txHash,
            processingStartedAt: null,
            status: CommitmentStatus.COMPLETED,
            events: {
              create: {
                fromStatus: CommitmentStatus.ACTIVE,
                metadata: {
                  confidence: decision.confidence,
                  reasoning: decision.reasoning,
                  verificationId: verification.id
                },
                toStatus: CommitmentStatus.COMPLETED,
                txHash: resolution.txHash,
                type: CommitmentEventType.VERIFIED_COMPLETED
              }
            }
          },
          where: {
            id: commitment.id
          }
        });

        logger.info(
          {
            commitmentId: commitment.id,
            onchainId: commitment.onchainId.toString(),
            txHash: resolution.txHash
          },
          "Commitment completed after initial verification"
        );

        return;
      }

      const appealAllowed = this.isAppealAllowedForFailedVerification(decision.confidence);
      const resolution = await this.contractService.markFailedOnChain(commitment.onchainId);
      const targetStatus = appealAllowed
        ? CommitmentStatus.FAILED_PENDING_APPEAL
        : CommitmentStatus.FAILED_FINAL;

      await prisma.commitment.update({
        data: {
          ...(appealAllowed
            ? {
                appealWindowEndsAt: resolution.appealWindowEndsAt ?? null
              }
            : {}),
          failureMarkedAt: new Date(),
          isProcessing: false,
          markFailedTxHash: resolution.txHash,
          processingStartedAt: null,
          status: targetStatus,
          events: {
            create: {
              fromStatus: CommitmentStatus.ACTIVE,
              metadata: {
                appealAllowed,
                confidence: decision.confidence,
                reasoning: decision.reasoning,
                verificationId: verification.id
              },
              toStatus: targetStatus,
              txHash: resolution.txHash,
              type: CommitmentEventType.VERIFIED_FAILED
            }
          }
        },
        where: {
          id: commitment.id
        }
      });

      logger.info(
        {
          appealAllowed,
          commitmentId: commitment.id,
          confidence: decision.confidence,
          onchainId: commitment.onchainId.toString(),
          targetStatus,
          txHash: resolution.txHash
        },
        "Commitment moved to failed state after initial verification"
      );
    } catch (error) {
      logger.error({ commitmentId, error }, "Initial verification job failed");
      throw error;
    } finally {
      if (lockedCommitmentId !== null) {
        await this.releaseProcessingLockSafely(
          lockedCommitmentId,
          "processInitialVerification.finally"
        );
      }
    }
  }

  /**
   * This function runs the appeal AI workflow and resolves the corresponding on-chain appeal.
   * It receives the off-chain commitment id from the queue.
   * It returns a promise that resolves after the appeal is fully resolved.
   * It is important because appealed commitments require a final irreversible completion or failure outcome.
   */
  private async processAppealResolution(commitmentId: string) {
    let lockedCommitmentId: string | null = null;
    try {
      const commitment = await this.getCommitmentById(commitmentId);
      lockedCommitmentId = commitment.id;

      if (
        commitment.status !== CommitmentStatus.FAILED_PENDING_APPEAL ||
        !commitment.appealed ||
        !commitment.isProcessing
      ) {
        logger.warn(
          {
            appealed: commitment.appealed,
            commitmentId: commitment.id,
            isProcessing: commitment.isProcessing,
            status: commitment.status
          },
          "Skipped appeal resolution because the commitment left the expected state"
        );
        return;
      }

      const latestEvidence = this.getLatestEvidence(commitment);
      const latestInitialVerification = commitment.verifications.find(
        (verification) => verification.type === VerificationType.INITIAL
      );

      const decision = await this.aiService.verifyEvidence(
        this.buildVerificationContext(
          commitment,
          latestEvidence,
          latestInitialVerification?.reasoning
        ),
        "appeal"
      );

      const verification = await prisma.verification.create({
        data: {
          commitmentId: commitment.id,
          confidence: decision.confidence,
          evidenceId: latestEvidence.id,
          model: env.GEMINI_API_KEY !== undefined ? env.GEMINI_MODEL : "mock-gemini-heuristic",
          provider: env.GEMINI_API_KEY !== undefined ? "google-genai" : "mock",
          rawResponse: decision.rawResponse as Prisma.InputJsonValue,
          reasoning: decision.reasoning,
          result: decision.success,
          type: VerificationType.APPEAL
        }
      });

      const resolution = await this.contractService.resolveAppealOnChain(
        commitment.onchainId,
        decision.success
      );
      const targetStatus = decision.success
        ? CommitmentStatus.COMPLETED
        : CommitmentStatus.FAILED_FINAL;

      await prisma.commitment.update({
        data: {
          completedAt: decision.success ? new Date() : commitment.completedAt,
          failedFinalAt: decision.success ? commitment.failedFinalAt : new Date(),
          isProcessing: false,
          processingStartedAt: null,
          resolveAppealTxHash: resolution.txHash,
          status: targetStatus,
          events: {
            create: {
              fromStatus: CommitmentStatus.FAILED_PENDING_APPEAL,
              metadata: {
                confidence: decision.confidence,
                reasoning: decision.reasoning,
                verificationId: verification.id
              },
              toStatus: targetStatus,
              txHash: resolution.txHash,
              type: CommitmentEventType.APPEAL_RESOLVED
            }
          }
        },
        where: {
          id: commitment.id
        }
      });

      logger.info(
        {
          commitmentId: commitment.id,
          onchainId: commitment.onchainId.toString(),
          success: decision.success,
          txHash: resolution.txHash
        },
        "Appeal resolved successfully"
      );
    } catch (error) {
      logger.error({ commitmentId, error }, "Appeal resolution job failed");
      throw error;
    } finally {
      if (lockedCommitmentId !== null) {
        await this.releaseProcessingLockSafely(
          lockedCommitmentId,
          "processAppealResolution.finally"
        );
      }
    }
  }

  /**
   * This function executes the failed-finalization workflow against the contract and database.
   * It receives the off-chain commitment id.
   * It returns the updated commitment aggregate.
   * It is important because both the maintenance loop and manual internal endpoint reuse the same settlement logic.
   */
  private async runFailedFinalization(commitmentId: string): Promise<PresentedCommitment> {
    let lockedCommitmentId: string | null = null;
    try {
      const commitment = await this.getCommitmentById(commitmentId);
      lockedCommitmentId = commitment.id;

      if (
        (commitment.status !== CommitmentStatus.FAILED_PENDING_APPEAL &&
          commitment.status !== CommitmentStatus.FAILED_FINAL) ||
        commitment.appealed ||
        commitment.finalizeFailedTxHash !== null
      ) {
        throw new AppError(
          409,
          "FAILED_FINALIZATION_NOT_ALLOWED",
          "The commitment is no longer eligible for failed finalization."
        );
      }

      const finalizationReadyAt = await this.getCommitmentFinalizationReadyAt(commitment);

      if (finalizationReadyAt !== null && finalizationReadyAt > new Date()) {
        throw new AppError(
          409,
          "FAILED_FINALIZATION_TOO_EARLY",
          "The appeal window is still open for this commitment."
        );
      }

      const resolution = await this.contractService.finalizeFailedOnChain(commitment.onchainId);
      const updatedCommitment = await prisma.commitment.update({
        data: {
          failedFinalAt: new Date(),
          finalizeFailedTxHash: resolution.txHash,
          isProcessing: false,
          processingStartedAt: null,
          status: CommitmentStatus.FAILED_FINAL,
          events: {
            create: {
              fromStatus: commitment.status,
              toStatus: CommitmentStatus.FAILED_FINAL,
              txHash: resolution.txHash,
              type: CommitmentEventType.FAILED_FINALIZED
            }
          }
        },
        include: commitmentInclude,
        where: {
          id: commitment.id
        }
      });

      return this.presentCommitment(updatedCommitment);
    } catch (error) {
      logger.error({ commitmentId, error }, "Failed finalization job failed");
      throw error;
    } finally {
      if (lockedCommitmentId !== null) {
        await this.releaseProcessingLockSafely(
          lockedCommitmentId,
          "runFailedFinalization.finally"
        );
      }
    }
  }

  /**
   * This function loads the authenticated user record from persistence.
   * It receives the authenticated request context extracted from the JWT.
   * It returns the matching user record.
   * It is important because ownership checks should rely on persisted user ids and normalized wallet addresses.
   */
  private async getAuthenticatedUser(auth: AuthenticatedUserContext) {
    const user = await prisma.user.findUnique({
      where: {
        id: auth.userId
      }
    });

    if (user === null || getAddress(user.walletAddress) !== getAddress(auth.walletAddress)) {
      throw new AppError(401, "AUTH_INVALID", "Authenticated wallet context is no longer valid.");
    }

    return user;
  }

  /**
   * This function loads a commitment owned by the authenticated user.
   * It receives the off-chain commitment id and the user id.
   * It returns the hydrated commitment aggregate.
   * It is important because user-facing routes must never operate on another wallet's commitment.
   */
  private async getOwnedCommitment(commitmentId: string, userId: string) {
    const commitment = await prisma.commitment.findFirst({
      include: commitmentInclude,
      where: {
        id: commitmentId,
        userId
      }
    });

    if (commitment === null) {
      throw new AppError(404, "COMMITMENT_NOT_FOUND", "Commitment not found for the authenticated user.");
    }

    return commitment;
  }

  /**
   * This function loads a commitment by off-chain UUID without ownership filtering.
   * It receives the off-chain commitment id.
   * It returns the hydrated commitment aggregate.
   * It is important because internal flows and background jobs still need a safe aggregate loader.
   */
  private async getCommitmentById(commitmentId: string) {
    const commitment = await prisma.commitment.findUnique({
      include: commitmentInclude,
      where: {
        id: commitmentId
      }
    });

    if (commitment === null) {
      throw new AppError(404, "COMMITMENT_NOT_FOUND", "Commitment not found.");
    }

    return commitment;
  }

  /**
   * This function normalizes the createCommitment payload before persistence.
   * It receives the raw HTTP payload.
   * It returns normalized values ready for on-chain validation and database insertion.
   * It is important because frontend-provided metadata should be validated before it is compared against chain state.
   */
  private normalizeCommitmentInput(input: CreateCommitmentInput) {
    const deadline = new Date(input.deadline);

    if (Number.isNaN(deadline.getTime())) {
      throw new AppError(400, "COMMITMENT_DEADLINE_INVALID", "The commitment deadline is invalid.");
    }

    return {
      amount: input.amount,
      createCommitmentTxHash: input.createCommitmentTxHash,
      deadline,
      deadlineUnix: Math.floor(deadline.getTime() / 1_000),
      description: input.description.trim(),
      failReceiver: getAddress(input.failReceiver),
      onchainId: BigInt(input.onchainId),
      title: input.title.trim()
    };
  }

  /**
   * This function validates that the metadata received from frontend matches the on-chain commitment snapshot.
   * It receives the authenticated wallet address, the normalized payload and the on-chain snapshot.
   * It returns nothing and throws when any relevant field diverges.
   * It is important because the database should never persist product metadata that contradicts the contract.
   */
  private assertCreateInputMatchesOnChain(
    walletAddress: string,
    input: ReturnType<CommitmentService["normalizeCommitmentInput"]>,
    onChainCommitment: Awaited<ReturnType<ContractService["getCommitmentOnChain"]>>
  ) {
    if (getAddress(onChainCommitment.user) !== getAddress(walletAddress)) {
      throw new AppError(
        409,
        "CHAIN_USER_MISMATCH",
        "The on-chain commitment belongs to a different wallet."
      );
    }

    if (onChainCommitment.amount !== input.amount) {
      throw new AppError(
        409,
        "CHAIN_AMOUNT_MISMATCH",
        "The provided amount does not match the on-chain commitment."
      );
    }

    if (Math.floor(onChainCommitment.deadline.getTime() / 1_000) !== input.deadlineUnix) {
      throw new AppError(
        409,
        "CHAIN_DEADLINE_MISMATCH",
        "The provided deadline does not match the on-chain commitment."
      );
    }

    if (getAddress(onChainCommitment.failReceiver) !== input.failReceiver) {
      throw new AppError(
        409,
        "CHAIN_FAIL_RECEIVER_MISMATCH",
        "The provided fail receiver does not match the on-chain commitment."
      );
    }
  }

  /**
   * This function maps the contract state into the logical database status.
   * It receives the on-chain contract status and payout state.
   * It returns the corresponding database status.
   * It is important because product state should mirror real contract outcomes without guessing.
   */
  private mapOnChainStateToDatabaseStatus(status: number, payoutState: number): CommitmentStatus {
    if (status === 0) {
      return CommitmentStatus.ACTIVE;
    }

    if (status === 1) {
      return CommitmentStatus.COMPLETED;
    }

    if (status === 2 && payoutState === 0) {
      return CommitmentStatus.FAILED_PENDING_APPEAL;
    }

    if (status === 2 && payoutState === 2) {
      return CommitmentStatus.FAILED_FINAL;
    }

    throw new AppError(
      409,
      "CHAIN_STATE_UNSUPPORTED",
      "The on-chain commitment state cannot be mapped to a supported database status."
    );
  }

  /**
   * This function tells whether evidence uploads are still allowed for a commitment.
   * It receives the current status and processing lock.
   * It returns true when a new evidence upload is acceptable.
   * It is important because evidence should not mutate commitments during active backend resolution.
   */
  private canUploadEvidence(status: CommitmentStatus, isProcessing: boolean) {
    return (
      !isProcessing &&
      (status === CommitmentStatus.ACTIVE || status === CommitmentStatus.FAILED_PENDING_APPEAL)
    );
  }

  /**
   * This function asserts that a commitment is ready for an initial verification.
   * It receives the hydrated commitment aggregate.
   * It returns nothing and throws when the commitment is not eligible.
   * It is important because double verification must be prevented before acquiring the processing lock.
   */
  private assertInitialVerificationEligibility(commitment: CommitmentRecord) {
    if (commitment.status !== CommitmentStatus.ACTIVE) {
      throw new AppError(
        409,
        "VERIFICATION_NOT_ALLOWED",
        "Only active commitments can enter initial verification."
      );
    }

    if (commitment.isProcessing) {
      throw new AppError(
        409,
        "VERIFICATION_ALREADY_RUNNING",
        "This commitment is already being processed."
      );
    }
  }

  /**
   * This function asserts that a commitment is ready for appeal resolution.
   * It receives the hydrated commitment aggregate.
   * It returns nothing and throws when the commitment is not eligible.
   * It is important because only failed commitments with a recorded appeal can enter the appeal workflow.
   */
  private assertAppealResolutionEligibility(commitment: CommitmentRecord) {
    if (commitment.status !== CommitmentStatus.FAILED_PENDING_APPEAL || !commitment.appealed) {
      throw new AppError(
        409,
        "APPEAL_RESOLUTION_NOT_ALLOWED",
        "This commitment is not ready for appeal resolution."
      );
    }

    if (commitment.isProcessing) {
      throw new AppError(
        409,
        "APPEAL_RESOLUTION_ALREADY_RUNNING",
        "This commitment is already being processed."
      );
    }
  }

  /**
   * This function validates that an appealed commitment still satisfies the evidence rules required for appeal review.
   * It receives the hydrated commitment aggregate already loaded from persistence.
   * It returns nothing and throws when the appeal does not qualify for re-evaluation.
   * It is important because appeal resolution should only run for uncertain failures backed by newly uploaded evidence.
   */
  private assertAppealHasRequiredEvidence(commitment: CommitmentRecord) {
    const latestInitialVerification = this.getLatestInitialVerification(commitment);

    if (!this.isAppealAllowedForFailedVerification(latestInitialVerification.confidence)) {
      throw new AppError(
        409,
        "APPEAL_NOT_ALLOWED",
        "Appeals are only available for uncertain failed verifications."
      );
    }

    if (!this.hasNewEvidenceForAppeal(commitment, latestInitialVerification)) {
      throw new AppError(
        409,
        "APPEAL_REQUIRES_NEW_EVIDENCE",
        "Appeal resolution requires new evidence uploaded after the initial failed verification."
      );
    }
  }

  /**
   * This function asserts that a commitment is ready for failed finalization.
   * It receives the hydrated commitment aggregate.
   * It returns nothing and throws when the commitment is not eligible.
   * It is important because only expired, unappealed failed commitments can move to FAILED_FINAL.
   */
  private async assertFailedFinalizationEligibility(commitment: CommitmentRecord) {
    if (
      commitment.status !== CommitmentStatus.FAILED_PENDING_APPEAL &&
      commitment.status !== CommitmentStatus.FAILED_FINAL
    ) {
      throw new AppError(
        409,
        "FAILED_FINALIZATION_NOT_ALLOWED",
        "Only failed commitments awaiting definitive settlement can be finalized."
      );
    }

    if (commitment.appealed) {
      throw new AppError(
        409,
        "FAILED_FINALIZATION_BLOCKED",
        "Appealed commitments must be resolved through the appeal workflow."
      );
    }

    if (commitment.isProcessing) {
      throw new AppError(
        409,
        "FAILED_FINALIZATION_ALREADY_RUNNING",
        "This commitment is already being processed."
      );
    }

    if (commitment.finalizeFailedTxHash !== null) {
      throw new AppError(
        409,
        "FAILED_FINALIZATION_NOT_ALLOWED",
        "This commitment was already finalized."
      );
    }

    const finalizationReadyAt = await this.getCommitmentFinalizationReadyAt(commitment);

    if (finalizationReadyAt !== null && finalizationReadyAt > new Date()) {
      throw new AppError(
        409,
        "FAILED_FINALIZATION_TOO_EARLY",
        "The appeal window is still open for this commitment."
      );
    }
  }

  /**
   * This function acquires the idempotency lock for a commitment when it is in an allowed status.
   * It receives the commitment id and the list of statuses allowed for the operation.
   * It returns nothing and throws when the lock cannot be acquired.
   * It is important because verify, resolve-appeal and finalize-failed must never execute twice concurrently.
   */
  private async acquireProcessingLock(commitmentId: string, allowedStatuses: CommitmentStatus[]) {
    const updatedRows = await prisma.commitment.updateMany({
      data: {
        isProcessing: true,
        processingStartedAt: new Date()
      },
      where: {
        id: commitmentId,
        isProcessing: false,
        status: {
          in: allowedStatuses
        }
      }
    });

    if (updatedRows.count !== 1) {
      throw new AppError(
        409,
        "PROCESSING_LOCK_UNAVAILABLE",
        "The commitment could not acquire its processing lock."
      );
    }
  }

  /**
   * This function releases the processing lock without changing the current logical status.
   * It receives the commitment id.
   * It returns nothing because the update is internal.
   * It is important because failed background jobs should become retryable instead of remaining stuck forever.
   */
  private async releaseProcessingLock(commitmentId: string) {
    await prisma.commitment.update({
      data: {
        isProcessing: false,
        processingStartedAt: null
      },
      where: {
        id: commitmentId
      }
    });
  }

  /**
   * This function releases the processing lock without masking the original failure path.
   * It receives the commitment id plus a short context label for logs.
   * It returns nothing because the cleanup is best-effort.
   * It is important because background jobs should never remain stuck if the normal processing path fails.
   */
  private async releaseProcessingLockSafely(commitmentId: string, context: string) {
    try {
      await this.releaseProcessingLock(commitmentId);
    } catch (error) {
      logger.error(
        {
          commitmentId,
          context,
          error
        },
        "Failed to release processing lock safely"
      );
    }
  }

  /**
   * This function appends one history event to a commitment.
   * It receives the commitment id and the event payload.
   * It returns nothing because the side effect is persisted internally.
   * It is important because the latest status alone is not enough to audit the full product lifecycle.
   */
  private async appendEvent(
    commitmentId: string,
    event: {
      fromStatus?: CommitmentStatus;
      metadata?: Prisma.InputJsonValue;
      toStatus?: CommitmentStatus;
      txHash?: string;
      type: CommitmentEventType;
    }
  ) {
    await prisma.commitmentEvent.create({
      data: {
        commitmentId,
        fromStatus: event.fromStatus ?? null,
        ...(event.metadata === undefined ? {} : { metadata: event.metadata }),
        toStatus: event.toStatus ?? null,
        txHash: event.txHash ?? null,
        type: event.type
      }
    });
  }

  /**
   * This function extracts the latest evidence record from a hydrated commitment aggregate.
   * It receives the commitment record already loaded with evidence sorted by recency.
   * It returns the most recent evidence row.
   * It is important because verification should operate on the freshest user submission.
   */
  private getLatestEvidence(commitment: CommitmentRecord) {
    const latestEvidence = commitment.evidences[0];

    if (latestEvidence === undefined) {
      throw new AppError(
        409,
        "EVIDENCE_NOT_FOUND",
        "The commitment does not have evidence ready for verification."
      );
    }

    return latestEvidence;
  }

  /**
   * This function returns the latest initial verification stored for a commitment.
   * It receives the hydrated commitment aggregate already loaded with verification history.
   * It returns the most recent INITIAL verification row.
   * It is important because appeal eligibility now depends on the outcome and confidence of the initial failed decision.
   */
  private getLatestInitialVerification(commitment: CommitmentRecord) {
    const latestInitialVerification = commitment.verifications.find(
      (verification) => verification.type === VerificationType.INITIAL
    );

    if (latestInitialVerification === undefined || latestInitialVerification.result) {
      throw new AppError(
        409,
        "APPEAL_NOT_ALLOWED",
        "Appeals require an initial failed verification."
      );
    }

    return latestInitialVerification;
  }

  /**
   * This function tells whether a failed verification is uncertain enough to allow an appeal.
   * It receives the confidence score produced by the initial verification workflow.
   * It returns true when the confidence is below the uncertainty threshold.
   * It is important because clear failures and uncertain failures now follow different product behavior.
   */
  private isAppealAllowedForFailedVerification(confidence: number) {
    return confidence < UNCERTAIN_FAILURE_CONFIDENCE_THRESHOLD;
  }

  /**
   * This function checks whether the user uploaded new evidence after the initial failed verification.
   * It receives the hydrated commitment aggregate and the initial failed verification row.
   * It returns true when at least one newer evidence row exists.
   * It is important because an appeal should contribute new material instead of replaying the same evidence set.
   */
  private hasNewEvidenceForAppeal(
    commitment: CommitmentRecord,
    initialFailedVerification: CommitmentRecord["verifications"][number]
  ) {
    return commitment.evidences.some(
      (evidence) =>
        evidence.id !== initialFailedVerification.evidenceId &&
        evidence.createdAt > initialFailedVerification.createdAt
    );
  }

  /**
   * This function returns the effective timestamp after which a commitment may be finalized on-chain.
   * It receives the hydrated commitment aggregate currently being evaluated for final settlement.
   * It returns the ready-at timestamp derived from persisted data or contract configuration.
   * It is important because clear failures now use FAILED_FINAL as a logical UX state before the contract can be finalized.
   */
  private async getCommitmentFinalizationReadyAt(commitment: CommitmentRecord) {
    if (commitment.appealWindowEndsAt !== null) {
      return commitment.appealWindowEndsAt;
    }

    if (commitment.failureMarkedAt === null) {
      return null;
    }

    const appealWindowSeconds = await this.contractService.getAppealWindowSeconds();

    return new Date(commitment.failureMarkedAt.getTime() + Number(appealWindowSeconds) * 1_000);
  }

  /**
   * This function computes the oldest failure-mark timestamp that should already be eligible for finalization.
   * It receives no parameters because the appeal window length is read from the contract configuration.
   * It returns the cutoff date used by the maintenance loop for clear failures.
   * It is important because the background finalizer can no longer rely on appealWindowEndsAt for logical FAILED_FINAL rows.
   */
  private async getClearFailureReadyAtCutoff() {
    const appealWindowSeconds = await this.contractService.getAppealWindowSeconds();
    return new Date(Date.now() - Number(appealWindowSeconds) * 1_000);
  }

  /**
   * This function builds the verification context consumed by the AI service.
   * It receives the commitment aggregate, the latest evidence and optional previous reasoning.
   * It returns the structured AI input.
   * It is important because initial review and appeal review should remain reproducible.
   */
  private buildVerificationContext(
    commitment: CommitmentRecord,
    evidence: CommitmentRecord["evidences"][number],
    previousReasoning?: string
  ) {
    return {
      description: commitment.description,
      evidenceText: evidence.extractedText,
      ...(previousReasoning === undefined ? {} : { previousReasoning }),
      title: commitment.title
    };
  }

  /**
   * This function converts the stored filename into the persisted logical file URL.
   * It receives the stored filename generated by the upload layer.
   * It returns a normalized file URL string.
   * It is important because the database should store a stable file locator instead of an absolute machine path.
   */
  private buildFileUrl(storedFileName: string) {
    const normalizedDirectory = env.UPLOAD_DIR.replace(/\\/g, "/").replace(/^\/+/, "");
    return `/${normalizedDirectory}/${storedFileName}`;
  }

  /**
   * This function converts a hydrated commitment aggregate into the API response shape.
   * It receives the commitment record with relations already loaded.
   * It returns a JSON-safe object for controllers and tests.
   * It is important because the API should expose the latest state together with evidence, verifications and history.
   */
  private presentCommitment(commitment: CommitmentRecord): PresentedCommitment {
    return {
      amount: commitment.amount,
      appealWindowEndsAt: commitment.appealWindowEndsAt,
      appealed: commitment.appealed,
      completedAt: commitment.completedAt,
      createCommitmentTxHash: commitment.createCommitmentTxHash,
      createdAt: commitment.createdAt,
      deadline: commitment.deadline,
      description: commitment.description,
      events: commitment.events.map((event) => this.presentEvent(event)),
      evidences: commitment.evidences.map((evidence) => this.presentEvidence(evidence)),
      failedFinalAt: commitment.failedFinalAt,
      failReceiver: commitment.failReceiver,
      failureMarkedAt: commitment.failureMarkedAt,
      finalizeFailedTxHash: commitment.finalizeFailedTxHash,
      id: commitment.id,
      isProcessing: commitment.isProcessing,
      markCompletedTxHash: commitment.markCompletedTxHash,
      markFailedTxHash: commitment.markFailedTxHash,
      onchainId: commitment.onchainId.toString(),
      processingStartedAt: commitment.processingStartedAt,
      resolveAppealTxHash: commitment.resolveAppealTxHash,
      status: commitment.status,
      title: commitment.title,
      updatedAt: commitment.updatedAt,
      userWalletAddress: commitment.user.walletAddress,
      verifications: commitment.verifications.map((verification) =>
        this.presentVerification(verification)
      )
    };
  }

  /**
   * This function converts one evidence record into its API representation.
   * It receives the persisted evidence row.
   * It returns the public evidence payload.
   * It is important because clients and judges need to inspect the evidence chain tied to a commitment.
   */
  private presentEvidence(evidence: CommitmentRecord["evidences"][number]): PresentedEvidence {
    return {
      createdAt: evidence.createdAt,
      extractedText: evidence.extractedText,
      fileSize: evidence.fileSize,
      fileUrl: evidence.fileUrl,
      id: evidence.id,
      mimeType: evidence.mimeType,
      originalFileName: evidence.originalFileName,
      storedFileName: evidence.storedFileName
    };
  }

  /**
   * This function converts one verification row into its API representation.
   * It receives the persisted verification row.
   * It returns the public verification payload.
   * It is important because AI reasoning is part of the core product trust model.
   */
  private presentVerification(
    verification: CommitmentRecord["verifications"][number]
  ): PresentedVerification {
    return {
      confidence: verification.confidence,
      createdAt: verification.createdAt,
      evidenceId: verification.evidenceId,
      id: verification.id,
      model: verification.model,
      provider: verification.provider,
      reasoning: verification.reasoning,
      result: verification.result,
      type: verification.type
    };
  }

  /**
   * This function converts one history event row into its API representation.
   * It receives the persisted event row.
   * It returns the public history payload.
   * It is important because event history is the audit trail that explains each status transition.
   */
  private presentEvent(event: CommitmentRecord["events"][number]): PresentedEvent {
    return {
      createdAt: event.createdAt,
      fromStatus: event.fromStatus,
      id: event.id,
      metadata: event.metadata,
      toStatus: event.toStatus,
      txHash: event.txHash,
      type: event.type
    };
  }
}
