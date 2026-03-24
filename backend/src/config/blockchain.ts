/**
 * This file builds the shared blockchain clients used by the backend.
 * It exists to centralize provider, signer and contract interface setup in one audited location.
 * It fits the system by ensuring every on-chain interaction uses the same ABI and network configuration.
 */
import { Contract, Interface, JsonRpcProvider, Wallet } from "ethers";
import type { InterfaceAbi } from "ethers";

import timeLendArtifact from "@timelend/shared/abi/TimeLend.json";

import { env } from "./env";

type TimeLendArtifact = {
  abi: InterfaceAbi;
  contractName: string;
  deployedAddress?: string;
};

const parsedArtifact = timeLendArtifact as TimeLendArtifact;

/**
 * This constant creates the shared JSON-RPC provider for Avalanche Fuji.
 * It receives no direct parameters because the connection settings are already validated in env.
 * It returns an ethers provider instance.
 * It is important because user-relayed and system-signed transactions must use the same network transport.
 */
export const provider = new JsonRpcProvider(env.RPC_URL, env.AVALANCHE_CHAIN_ID);

/**
 * This constant creates the hot wallet used for backend-only resolution actions.
 * It receives its credentials from the validated environment configuration.
 * It returns an ethers wallet connected to the shared provider.
 * It is important because the backend is the only actor allowed to execute privileged contract functions.
 */
export const systemSigner = new Wallet(env.PRIVATE_KEY, provider);

/**
 * This constant exposes the contract interface for encoding, decoding and log parsing.
 * It receives its ABI from the shared artifact exported by the smart contract workspace.
 * It returns an ethers Interface instance.
 * It is important because relayed user transactions and backend transactions must be validated against the exact same ABI.
 */
export const timeLendInterface = new Interface(parsedArtifact.abi);

/**
 * This function creates a contract instance bound to the system signer.
 * It receives no parameters because the contract address and signer are already configured.
 * It returns an ethers Contract instance for privileged backend calls.
 * It is important because resolution actions should not have to reconfigure contract wiring in each service method.
 */
export function createSystemContract() {
  return new Contract(env.TIME_LEND_CONTRACT_ADDRESS, parsedArtifact.abi, systemSigner);
}

/**
 * This function creates a read-only contract instance bound to the shared provider.
 * It receives no parameters because the contract address and provider are already configured.
 * It returns an ethers Contract instance for read operations and receipt parsing.
 * It is important because some backend operations only need read access or ABI decoding.
 */
export function createReadOnlyContract() {
  return new Contract(env.TIME_LEND_CONTRACT_ADDRESS, parsedArtifact.abi, provider);
}
