# Shared

The `@timelend/shared` package contains cross-workspace contracts that should remain consistent between frontend, backend, and future integrations.

## Current Contents

- Shared application constants
- Domain enums
- DTOs and types
- Shared schema foundations and validation building blocks
- Exported ABI artifact path

## Purpose

This package prevents duplication of domain contracts across workspaces and provides a stable import surface for shared runtime and compile-time data.

## Package Exports

- Main package exports from `shared/src/index.ts`
- ABI artifact export: `@timelend/shared/abi/TimeLend.json`

## Usage Guideline

Any contract that must remain consistent across multiple workspaces should be defined here before being copied into app-specific modules.
