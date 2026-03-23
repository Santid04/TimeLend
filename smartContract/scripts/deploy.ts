/**
 * This file defines the production deployment workflow for the TimeLend contract.
 * It exists to deploy the contract, optionally configure the backend wallet and export the ABI artifact in one step.
 * It fits the system by giving backend and frontend a deterministic contract deployment entry point.
 */
import * as dotenv from "dotenv";
import { ethers, network } from "hardhat";

import { exportContractArtifact } from "./export-abi";

dotenv.config();

/**
 * This function guarantees that a required runtime value is present.
 * It receives a possibly undefined value and a label used for error reporting.
 * It returns the same value narrowed to a defined type.
 * It is important because deployment should fail loudly when required configuration is missing.
 */
function ensureDefined<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`Expected ${label} to be defined.`);
  }

  return value;
}

/**
 * This function parses the appeal window configured for deployment.
 * It receives no parameters because the raw value comes from process environment variables.
 * It returns the appeal window as a positive bigint.
 * It is important because the appeal window is immutable and must be validated before deployment.
 */
function getAppealWindow(): bigint {
  const rawAppealWindow = process.env.APPEAL_WINDOW_SECONDS ?? "86400";
  const appealWindow = BigInt(rawAppealWindow);

  if (appealWindow <= 0n) {
    throw new Error("APPEAL_WINDOW_SECONDS must be greater than zero.");
  }

  return appealWindow;
}

/**
 * This function deploys the TimeLend contract, optionally configures the backend and exports the ABI artifact.
 * It receives no parameters because deployment inputs come from Hardhat signers and environment variables.
 * It returns a promise that resolves after deployment, optional backend setup and ABI export complete.
 * It is important because later backend integration depends on a stable deploy-and-export workflow.
 */
async function main() {
  const [rawDeployer] = await ethers.getSigners();
  const deployer = ensureDefined(rawDeployer, "deployer signer");
  const initialOwner = process.env.INITIAL_OWNER_ADDRESS ?? deployer.address;
  const backendWallet = process.env.BACKEND_WALLET_ADDRESS;
  const appealWindow = getAppealWindow();

  const contract = await ethers.deployContract("TimeLend", [initialOwner, appealWindow]);

  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  /**
   * This block configures the backend wallet only when the operator explicitly provided one.
   * It is important because backend authorization is required before off-chain resolution can begin.
   */
  if (backendWallet !== undefined && backendWallet !== "") {
    if (initialOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      throw new Error(
        "BACKEND_WALLET_ADDRESS can only be set automatically when INITIAL_OWNER_ADDRESS matches the deployer."
      );
    }

    const setBackendFunction = contract.getFunction("setBackend");
    const backendTransaction = await setBackendFunction(backendWallet);

    await backendTransaction.wait();
  }

  const abiOutputPath = await exportContractArtifact("TimeLend", contractAddress);

  console.info("TimeLend deployed.", {
    abiOutputPath,
    address: contractAddress,
    appealWindow: appealWindow.toString(),
    backend: backendWallet ?? "not-configured",
    deployer: deployer.address,
    network: network.name,
    owner: initialOwner
  });
}

main().catch((error: unknown) => {
  console.error("Smart contract deployment failed.", error);
  process.exit(1);
});
