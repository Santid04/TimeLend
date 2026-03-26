# Smart Contract

The smart contract workspace contains the Solidity implementation of the TimeLend escrow lifecycle together with Hardhat-based tests, deployment scripts, and ABI export tooling.

## Main Contract

- `contracts/TimeLend.sol`

## Current Capabilities

- Native AVAX commitment creation
- Custody of escrowed funds until final resolution
- Success settlement controlled by the system wallet
- Failed settlement with an appeal window
- One appeal per commitment
- Finalization path for failed commitments without appeal
- Rotatable backend/system wallet managed by the owner
- ABI export to `shared/abi/TimeLend.json`

## Lifecycle Design

The contract separates failed outcomes into two safe paths:

1. Appealable failure
   - Backend marks the commitment as failed
   - An appeal window opens
   - The user may consume the appeal on-chain
   - Funds are only released after appeal resolution or finalization

2. Final failure
   - The backend can settle immediately when no appeal path should remain
   - Funds are transferred to the configured fail receiver

This separation prevents insolvency scenarios during appeal handling.

## Commands

```bash
pnpm --filter smartContract compile
pnpm --filter smartContract test
pnpm --filter smartContract abi:export
pnpm --filter smartContract deploy:fuji
```

## Environment Variables

Copy `smartContract/.env.example` to `smartContract/.env`.

Relevant values:

- `FUJI_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- `INITIAL_OWNER_ADDRESS`
- `BACKEND_WALLET_ADDRESS`
- `APPEAL_WINDOW_SECONDS`

## Operational Notes

- Tests run on the local Hardhat network
- Fuji deployment is explicit and isolated behind `deploy:fuji`
- ABI export should be executed after contract changes so frontend and backend consume the updated artifact
