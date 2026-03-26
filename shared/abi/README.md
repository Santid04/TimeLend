# Shared ABI

This directory contains ABI artifacts exported from the smart contract workspace for consumption by the frontend and backend.

## Current Artifact

- `TimeLend.json`

## Source Of Truth

The ABI is generated from the Hardhat workspace in `smartContract` and should be refreshed after contract-level changes by running:

```bash
pnpm contracts:export-abi
```
