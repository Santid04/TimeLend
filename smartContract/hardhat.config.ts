/**
 * This file configures Hardhat for the TimeLend smart contract workspace.
 * It exists to centralize compiler, network and toolbox settings.
 * It fits the system by making contract compilation, testing and deployment reproducible.
 */
import * as dotenv from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

dotenv.config();

const defaultNetwork = process.env.HARDHAT_NETWORK ?? "hardhat";
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
const fujiRpcUrl = process.env.FUJI_RPC_URL ?? process.env.RPC_URL;

/**
 * This constant defines the Hardhat project configuration.
 * It receives its dynamic input from environment variables.
 * It returns the configuration object consumed by Hardhat.
 * It is important because all contract scripts and tests rely on one shared toolchain definition.
 */
const config: HardhatUserConfig = {
  defaultNetwork,
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40_000
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    ...(fujiRpcUrl
      ? {
          fuji: {
            chainId: 43_113,
            url: fujiRpcUrl,
            accounts: deployerPrivateKey ? [deployerPrivateKey] : []
          }
        }
      : {})
  }
};

export default config;
