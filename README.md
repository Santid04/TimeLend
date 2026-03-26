# TimeLend

TimeLend is a production-shaped demo for escrow-backed commitments on Avalanche Fuji. The project combines a Next.js frontend, an Express backend, a Solidity smart contract, and a Prisma/PostgreSQL persistence layer to support wallet authentication, evidence submission, AI-assisted verification, appeals, and settlement.

## Current Scope

The repository currently supports the following end-to-end flow:

- Wallet connection with Wagmi
- Authentication through a signed backend challenge
- On-chain commitment creation on Avalanche Fuji
- Off-chain metadata registration in PostgreSQL
- Evidence submission with text and `.pdf` or `.txt` files
- Initial AI verification and appeal handling
- Failed commitment finalization
- Bilingual UI toggle for static interface text (`EN | ES`)

## Monorepo Structure

- `frontend`: Next.js 15 application with App Router, dashboard flows, wallet integration, and UI localization
- `backend`: Express 5 API deployed under `/api/*`, responsible for auth, orchestration, AI calls, and privileged settlement actions
- `database`: Prisma schema, migrations, seed, and reusable database client
- `smartContract`: Hardhat workspace containing the `TimeLend` Solidity contract, tests, deploy scripts, and ABI export
- `shared`: Cross-workspace package for shared constants, types, schemas, and ABI artifacts
- `docs`: Deployment, architecture, setup, API reference, and demo validation material

## Technology Stack

- Frontend: Next.js, React 19, Tailwind CSS 4, Wagmi, Viem, TanStack Query
- Backend: Express, TypeScript, Zod, JWT, Vercel Functions, Vercel Blob
- Database: Prisma, PostgreSQL, Neon
- Smart contracts: Solidity, Hardhat, OpenZeppelin
- Shared tooling: pnpm workspaces, ESLint, Prettier, TypeScript

## Local Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL instance available locally or remotely
- A deployed `TimeLend` contract on Avalanche Fuji
- A browser wallet such as MetaMask for frontend testing

### Installation

```bash
pnpm install
```

### Environment Files

Create the environment files expected by each workspace:

- `frontend/.env.local` from `frontend/.env.example`
- `backend/.env` from `backend/.env.example`
- `database/.env` from `database/.env.example`
- `smartContract/.env` from `smartContract/.env.example`

The most important local values are:

- `frontend/.env.local`
  `NEXT_PUBLIC_API_URL=http://localhost:4000/api`
- `backend/.env`
  `FRONTEND_APP_URL=http://localhost:3000`
- `database/.env`
  `DATABASE_URL=...`
  `DIRECT_URL=...`

### Database Preparation

```bash
pnpm db:generate
pnpm db:migrate:dev
```

### Run The Platform

```bash
pnpm dev
```

Default local endpoints:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api`

## Useful Scripts

```bash
pnpm dev
pnpm dev:frontend
pnpm dev:backend
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm db:migrate:deploy
pnpm contracts:compile
pnpm contracts:test
pnpm contracts:export-abi
pnpm contracts:deploy:fuji
```

## Deployment Overview

TimeLend is designed to be deployed as two separate Vercel projects:

- Frontend project with `Root Directory = frontend`
- Backend project with `Root Directory = backend`

For preview and production deployments, two settings are critical:

- `NEXT_PUBLIC_API_URL` in the frontend must point to the backend public URL and include `/api`
- `FRONTEND_APP_URL` in the backend must include the exact frontend origin allowed by CORS, including preview domains when needed

## Documentation

- [Documentation Hub](./docs/README.md)
- [Local Setup](./docs/development/setup.md)
- [Deployment Guide](./docs/deploy/vercel.md)
- [Environment Variables](./docs/deploy/environment-variables.md)
- [Database And Migrations](./docs/deploy/database-and-migrations.md)
- [API Reference](./docs/api/README.md)

## Workspace READMEs

- [Frontend](./frontend/README.md)
- [Backend](./backend/README.md)
- [Database](./database/README.md)
- [Smart Contract](./smartContract/README.md)
- [Shared Package](./shared/README.md)
