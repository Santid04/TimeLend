/**
 * This file implements the backend integration with the TimeLend smart contract.
 * It exists to isolate ABI handling, transaction relay and privileged system-signer calls from the HTTP layer.
 * It fits the system by becoming the single audited gateway between backend business logic and on-chain state.
 */
import {
  Transaction,
  getAddress,
  isAddress,
  type LogDescription,
  type TransactionReceipt
} from "ethers";

import {
  createReadOnlyContract,
  createSystemContract,
  provider,
  timeLendInterface
} from "../config/blockchain";
import { env } from "../config/env";
import { logger } from "../config/logger";
import type {
  AppealOnChainInput,
  AppealOnChainResult,
  CreateCommitmentOnChainInput,
  CreateCommitmentOnChainResult,
  OnChainCommitmentSnapshot,
  PreparedUserTransaction,
  ResolutionOnChainResult
} from "../types/contracts";
import { AppError } from "../utils/app-error";

export class ContractService {
  private readonly readOnlyContract = createReadOnlyContract();
  private readonly systemContract = createSystemContract();

  /**
   * This function reads the on-chain commitment snapshot for one identifier.
   * It receives the on-chain commitment id.
   * It returns the normalized contract data needed to validate and synchronize database state.
   * It is important because the backend should not trust frontend-provided on-chain metadata blindly.
   */
  async getCommitmentOnChain(onchainId: bigint): Promise<OnChainCommitmentSnapshot> {
    const commitment = await this.readOnlyContract.getFunction("getCommitment").staticCall(onchainId);

    return {
      amount: commitment.amount.toString(),
      appealWindowEndsAt:
        commitment.appealWindowEndsAt > 0n
          ? new Date(Number(commitment.appealWindowEndsAt) * 1_000)
          : null,
      appealed: commitment.appealed,
      deadline: new Date(Number(commitment.deadline) * 1_000),
      failReceiver: getAddress(commitment.failReceiver),
      failureMarkedAt:
        commitment.failureMarkedAt > 0n
          ? new Date(Number(commitment.failureMarkedAt) * 1_000)
          : null,
      payoutState: Number(commitment.payoutState),
      status: Number(commitment.status),
      user: getAddress(commitment.user)
    };
  }

  /**
   * This function builds the unsigned user transaction required to create a commitment.
   * It receives the stake amount, deadline and fail receiver selected by the user.
   * It returns the prepared transaction request that the frontend wallet must sign.
   * It is important because the backend must keep ABI knowledge centralized even when relaying user-owned calls.
   */
  async buildCreateCommitmentTransaction(
    amountWei: string,
    deadlineUnix: number,
    failReceiver: string
  ): Promise<PreparedUserTransaction> {
    const data = timeLendInterface.encodeFunctionData("createCommitment", [
      BigInt(deadlineUnix),
      getAddress(failReceiver)
    ]);

    return {
      chainId: env.AVALANCHE_CHAIN_ID,
      data,
      to: env.TIME_LEND_CONTRACT_ADDRESS,
      value: amountWei
    };
  }

  /**
   * This function relays a user-signed createCommitment transaction and parses the resulting event.
   * It receives the validated wallet address, the expected commitment arguments and the signed raw transaction.
   * It returns the on-chain commitment id together with the transaction hash.
   * It is important because createCommitment must remain user-authored on-chain while still being broadcast by the backend.
   */
  async createCommitmentOnChain(
    input: CreateCommitmentOnChainInput
  ): Promise<CreateCommitmentOnChainResult> {
    const normalizedWalletAddress = getAddress(input.walletAddress);
    const expectedTransaction = await this.buildCreateCommitmentTransaction(
      input.amountWei,
      input.deadlineUnix,
      input.failReceiver
    );

    this.assertSignedTransactionMatchesExpectation(
      input.signedTransaction,
      normalizedWalletAddress,
      expectedTransaction
    );

    const broadcastTransaction = await provider.broadcastTransaction(input.signedTransaction);
    const transactionReceipt = await broadcastTransaction.wait();
    const parsedEvent = this.parseExpectedEvent(transactionReceipt, "CommitmentCreated");

    if (getAddress(parsedEvent.args.user) !== normalizedWalletAddress) {
      throw new AppError(
        400,
        "CHAIN_EVENT_MISMATCH",
        "The relayed transaction emitted a different user than expected."
      );
    }

    logger.info(
      {
        commitmentId: parsedEvent.args.commitmentId.toString(),
        txHash: broadcastTransaction.hash,
        walletAddress: normalizedWalletAddress
      },
      "Commitment created on-chain"
    );

    return {
      commitmentId: parsedEvent.args.commitmentId,
      txHash: broadcastTransaction.hash
    };
  }

  /**
   * This function builds the unsigned user transaction required to request an appeal on-chain.
   * It receives the on-chain commitment identifier.
   * It returns the prepared transaction request that the frontend wallet must sign.
   * It is important because the appeal function is user-owned on-chain even though the backend relays it.
   */
  async buildAppealTransaction(onchainId: bigint): Promise<PreparedUserTransaction> {
    const data = timeLendInterface.encodeFunctionData("appeal", [onchainId]);

    return {
      chainId: env.AVALANCHE_CHAIN_ID,
      data,
      to: env.TIME_LEND_CONTRACT_ADDRESS,
      value: "0"
    };
  }

  /**
   * This function relays a user-signed appeal transaction and verifies the emitted event.
   * It receives the expected wallet address, the on-chain commitment id and the signed raw transaction.
   * It returns the resulting transaction hash.
   * It is important because resolveAppeal will revert unless the user appeal was recorded on-chain first.
   */
  async requestAppealOnChain(input: AppealOnChainInput): Promise<AppealOnChainResult> {
    const normalizedWalletAddress = getAddress(input.walletAddress);
    const expectedTransaction = await this.buildAppealTransaction(input.onchainId);

    this.assertSignedTransactionMatchesExpectation(
      input.signedTransaction,
      normalizedWalletAddress,
      expectedTransaction
    );

    const broadcastTransaction = await provider.broadcastTransaction(input.signedTransaction);
    const transactionReceipt = await broadcastTransaction.wait();

    this.parseExpectedEvent(transactionReceipt, "AppealRequested");

    logger.info(
      {
        onchainId: input.onchainId.toString(),
        txHash: broadcastTransaction.hash,
        walletAddress: normalizedWalletAddress
      },
      "Appeal requested on-chain"
    );

    return {
      txHash: broadcastTransaction.hash
    };
  }

  /**
   * This function marks a commitment as completed using the backend system signer.
   * It receives the on-chain commitment identifier.
   * It returns the resulting transaction hash.
   * It is important because the backend is the only actor authorized to resolve successful verifications.
   */
  async markCompletedOnChain(onchainId: bigint): Promise<ResolutionOnChainResult> {
    const transaction = await this.systemContract.getFunction("markCompleted")(onchainId);
    const transactionReceipt = await transaction.wait();

    this.parseExpectedEvent(transactionReceipt, "CommitmentCompleted");

    logger.info(
      {
        onchainId: onchainId.toString(),
        txHash: transaction.hash
      },
      "Commitment completed on-chain"
    );

    return {
      txHash: transaction.hash
    };
  }

  /**
   * This function marks a commitment as failed using the backend system signer.
   * It receives the on-chain commitment identifier.
   * It returns the transaction hash and the on-chain appeal window end timestamp.
   * It is important because the backend must store the exact appeal deadline emitted by the contract.
   */
  async markFailedOnChain(onchainId: bigint): Promise<ResolutionOnChainResult> {
    const transaction = await this.systemContract.getFunction("markFailed")(onchainId);
    const transactionReceipt = await transaction.wait();
    const parsedEvent = this.parseExpectedEvent(transactionReceipt, "CommitmentFailed");

    logger.info(
      {
        appealWindowEndsAt: parsedEvent.args.appealWindowEndsAt.toString(),
        onchainId: onchainId.toString(),
        txHash: transaction.hash
      },
      "Commitment failed on-chain"
    );

    return {
      appealWindowEndsAt: new Date(Number(parsedEvent.args.appealWindowEndsAt) * 1_000),
      txHash: transaction.hash
    };
  }

  /**
   * This function marks a commitment as a clear final failure and immediately pays the fail receiver.
   * It receives the on-chain commitment identifier.
   * It returns the resulting transaction hash.
   * It is important because definitive failures should not remain in escrow when the backend does not allow appeals.
   */
  async markFailedFinalOnChain(onchainId: bigint): Promise<ResolutionOnChainResult> {
    const transaction = await this.systemContract.getFunction("markFailedFinal")(onchainId);
    const transactionReceipt = await transaction.wait();

    this.parseExpectedEvent(transactionReceipt, "FailedCommitmentFinalized");

    logger.info(
      {
        onchainId: onchainId.toString(),
        txHash: transaction.hash
      },
      "Commitment finalized as failed on-chain without appeal window"
    );

    return {
      txHash: transaction.hash
    };
  }

  /**
   * This function resolves an appealed commitment using the backend system signer.
   * It receives the on-chain commitment identifier and the final appeal decision.
   * It returns the resulting transaction hash.
   * It is important because appeal resolution is the last privileged decision point in the contract lifecycle.
   */
  async resolveAppealOnChain(
    onchainId: bigint,
    success: boolean
  ): Promise<ResolutionOnChainResult> {
    const transaction = await this.systemContract.getFunction("resolveAppeal")(onchainId, success);
    const transactionReceipt = await transaction.wait();

    this.parseExpectedEvent(transactionReceipt, "AppealResolved");

    logger.info(
      {
        onchainId: onchainId.toString(),
        success,
        txHash: transaction.hash
      },
      "Appeal resolved on-chain"
    );

    return {
      txHash: transaction.hash
    };
  }

  /**
   * This function finalizes an unappealed failure using the backend system signer.
   * It receives the on-chain commitment identifier.
   * It returns the resulting transaction hash.
   * It is important because failed commitments should not remain indefinitely pending once the appeal window expires.
   */
  async finalizeFailedOnChain(onchainId: bigint): Promise<ResolutionOnChainResult> {
    const transaction = await this.systemContract.getFunction("finalizeFailedCommitment")(onchainId);
    const transactionReceipt = await transaction.wait();

    this.parseExpectedEvent(transactionReceipt, "FailedCommitmentFinalized");

    logger.info(
      {
        onchainId: onchainId.toString(),
        txHash: transaction.hash
      },
      "Failed commitment finalized on-chain"
    );

    return {
      txHash: transaction.hash
    };
  }

  /**
   * This function returns the contract-configured appeal window.
   * It receives no parameters because the contract stores this value on-chain.
   * It returns the appeal window length in seconds as a bigint.
   * It is important because the backend may need this for diagnostics and startup checks.
   */
  async getAppealWindowSeconds() {
    return this.readOnlyContract.getFunction("appealWindow").staticCall();
  }

  /**
   * This function verifies that a signed raw transaction matches the expected contract call.
   * It receives the signed transaction, the expected signer address and the expected transaction request.
   * It returns nothing and throws when validation fails.
   * It is important because the backend must never relay user-signed transactions that target unexpected destinations or calldata.
   */
  private assertSignedTransactionMatchesExpectation(
    signedTransaction: string,
    walletAddress: string,
    expectedTransaction: PreparedUserTransaction
  ) {
    const parsedTransaction = Transaction.from(signedTransaction);

    if (parsedTransaction.to === null || !isAddress(parsedTransaction.to)) {
      throw new AppError(400, "CHAIN_TRANSACTION_INVALID", "The signed transaction target is invalid.");
    }

    if (parsedTransaction.from === null) {
      throw new AppError(400, "CHAIN_TRANSACTION_INVALID", "The signed transaction sender is missing.");
    }

    if (getAddress(parsedTransaction.from) !== walletAddress) {
      throw new AppError(
        400,
        "CHAIN_TRANSACTION_SIGNER_MISMATCH",
        "The signed transaction was not produced by the authenticated wallet."
      );
    }

    if (getAddress(parsedTransaction.to) !== getAddress(expectedTransaction.to)) {
      throw new AppError(
        400,
        "CHAIN_TRANSACTION_TARGET_MISMATCH",
        "The signed transaction targets a different contract."
      );
    }

    if (parsedTransaction.chainId !== BigInt(expectedTransaction.chainId)) {
      throw new AppError(
        400,
        "CHAIN_TRANSACTION_CHAIN_MISMATCH",
        "The signed transaction targets a different chain."
      );
    }

    if (parsedTransaction.data !== expectedTransaction.data) {
      throw new AppError(
        400,
        "CHAIN_TRANSACTION_DATA_MISMATCH",
        "The signed transaction calldata does not match the expected contract call."
      );
    }

    if (parsedTransaction.value !== BigInt(expectedTransaction.value)) {
      throw new AppError(
        400,
        "CHAIN_TRANSACTION_VALUE_MISMATCH",
        "The signed transaction value does not match the expected stake amount."
      );
    }
  }

  /**
   * This function extracts the expected event from a transaction receipt.
   * It receives the receipt and the event name that should be present.
   * It returns the parsed log description for the matching event.
   * It is important because backend state changes rely on contract events instead of guessing transaction effects.
   */
  private parseExpectedEvent(
    transactionReceipt: TransactionReceipt | null,
    eventName: string
  ): LogDescription {
    if (transactionReceipt === null) {
      throw new AppError(500, "CHAIN_RECEIPT_MISSING", "Transaction receipt was not available.");
    }

    for (const log of transactionReceipt.logs) {
      try {
        const parsedLog = timeLendInterface.parseLog(log);

        if (parsedLog?.name === eventName) {
          return parsedLog;
        }
      } catch {
        continue;
      }
    }

    throw new AppError(
      500,
      "CHAIN_EVENT_MISSING",
      `Expected ${eventName} event was not found in the transaction receipt.`
    );
  }
}
