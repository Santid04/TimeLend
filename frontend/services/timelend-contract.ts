/**
 * This file centralizes client-side contract helpers used by the demo frontend.
 * It exists to keep ABI access, event parsing and value conversion separate from React components.
 * It fits the system by isolating the only browser-owned blockchain interactions used in the demo.
 */
import type { Abi, Address, PublicClient, WalletClient } from "viem";
import { getAddress, parseEther, parseEventLogs } from "viem";
import { avalancheFuji } from "viem/chains";

import timeLendArtifact from "@timelend/shared/abi/TimeLend.json";

const timeLendAbi = timeLendArtifact.abi as Abi;

export type CreateCommitmentChainInput = {
  amountAvax: string;
  contractAddress: Address;
  deadlineUnix: bigint;
  failReceiver: string;
  walletAddress: Address;
};

export type CreateCommitmentChainResult = {
  amountWei: string;
  onchainId: string;
  txHash: string;
};

type CommitmentCreatedLog = {
  args?: {
    commitmentId?: bigint;
  };
};

/**
 * This function returns the canonical TimeLend ABI used by the demo wallet actions.
 * It receives no parameters because the ABI is imported statically from the shared workspace.
 * It returns the ABI cast required by viem helpers.
 * It is important because contract calls and event parsing must rely on one artifact source.
 */
export function getTimeLendAbi() {
  return timeLendAbi;
}

/**
 * This function creates a commitment on-chain with the connected wallet and extracts its emitted id.
 * It receives the wallet/public clients plus the normalized commitment creation input.
 * It returns the transaction hash, emitted on-chain id and wei amount sent to the contract.
 * It is important because the frontend is responsible for the initial escrow transaction in the current system design.
 */
export async function createCommitmentOnChain(
  walletClient: WalletClient,
  publicClient: PublicClient,
  input: CreateCommitmentChainInput,
): Promise<CreateCommitmentChainResult> {
  const amountWei = parseEther(input.amountAvax);
  const transactionHash = await walletClient.writeContract({
    abi: timeLendAbi,
    account: input.walletAddress,
    address: input.contractAddress,
    args: [input.deadlineUnix, getAddress(input.failReceiver)],
    chain: avalancheFuji,
    functionName: "createCommitment",
    value: amountWei,
  });

  const transactionReceipt = await publicClient.waitForTransactionReceipt({
    hash: transactionHash,
  });

  const parsedLogs = parseEventLogs({
    abi: timeLendAbi,
    eventName: "CommitmentCreated",
    logs: transactionReceipt.logs,
  });

  const createdLog = parsedLogs[0] as CommitmentCreatedLog | undefined;
  const emittedCommitmentId =
    createdLog !== undefined &&
    typeof createdLog.args === "object" &&
    createdLog.args !== null &&
    "commitmentId" in createdLog.args
      ? createdLog.args.commitmentId
      : undefined;

  if (emittedCommitmentId === undefined) {
    throw new Error("The createCommitment transaction did not emit CommitmentCreated.");
  }

  return {
    amountWei: amountWei.toString(),
    onchainId: emittedCommitmentId.toString(),
    txHash: transactionHash,
  };
}

/**
 * This function requests an appeal on-chain with the connected user wallet.
 * It receives the wallet/public clients, contract address, user wallet and target on-chain id.
 * It returns the resulting appeal transaction hash once mined.
 * It is important because the current backend expects the user appeal to already exist on-chain before syncing it.
 */
export async function requestAppealOnChain(
  walletClient: WalletClient,
  publicClient: PublicClient,
  contractAddress: Address,
  walletAddress: Address,
  onchainId: string,
) {
  const transactionHash = await walletClient.writeContract({
    abi: timeLendAbi,
    account: walletAddress,
    address: contractAddress,
    args: [BigInt(onchainId)],
    chain: avalancheFuji,
    functionName: "appeal",
  });

  await publicClient.waitForTransactionReceipt({
    hash: transactionHash,
  });

  return transactionHash;
}
