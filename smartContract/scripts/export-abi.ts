/**
 * This file exports the compiled TimeLend contract artifact into the shared workspace.
 * It exists so backend and frontend can consume one canonical ABI file without reading Hardhat artifacts directly.
 * It fits the system by bridging the smart contract build output with the rest of the monorepo.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

import { artifacts } from "hardhat";

type ExportedContractArtifact = {
  abi: unknown;
  contractName: string;
  deployedAddress?: string;
  exportedAt: string;
};

/**
 * This function exports the selected contract artifact into the shared ABI folder.
 * It receives the contract name and an optional deployed address to include for operator convenience.
 * It returns the absolute path of the written JSON file.
 * It is important because backend integration should rely on a stable, repository-owned contract artifact path.
 */
export async function exportContractArtifact(contractName: string, deployedAddress?: string) {
  const artifact = await artifacts.readArtifact(contractName);
  const outputPath = path.resolve(__dirname, `../../shared/abi/${contractName}.json`);
  const exportedArtifact: ExportedContractArtifact = {
    abi: artifact.abi,
    contractName,
    exportedAt: new Date().toISOString()
  };

  if (deployedAddress !== undefined) {
    exportedArtifact.deployedAddress = deployedAddress;
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(exportedArtifact, null, 2));

  return outputPath;
}

/**
 * This function exports the main TimeLend contract artifact using the current compilation output.
 * It receives no parameters because the contract name is fixed for this workspace.
 * It returns a promise that resolves after the ABI file is written.
 * It is important because developers and CI need a single command to refresh the shared artifact.
 */
async function main() {
  const outputPath = await exportContractArtifact("TimeLend");

  console.info("ABI exported.", {
    outputPath
  });
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error("ABI export failed.", error);
    process.exit(1);
  });
}
