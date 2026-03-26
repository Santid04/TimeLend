# Database

The database workspace contains the Prisma schema, generated client, migrations, and seed utilities used by TimeLend.

## Purpose

This package centralizes the relational model that supports wallet users, commitments, evidence, AI verification history, and lifecycle events.

## Core Models

- `User`: wallet identity, nonce, and ownership of commitments
- `Commitment`: off-chain lifecycle aggregate linked to `onchainId`
- `Evidence`: uploaded files, extracted text, and written proof
- `Verification`: AI decisions for initial and appeal flows
- `CommitmentEvent`: append-only history of relevant lifecycle transitions

## Status Mapping

- `ACTIVE`: commitment created and synchronized successfully
- `FAILED_PENDING_APPEAL`: failed result with an active appeal window
- `COMPLETED`: successful settlement
- `FAILED_FINAL`: final failed settlement after appeal resolution or timeout

## Commands

```bash
pnpm --filter @timelend/database prisma:generate
pnpm --filter @timelend/database prisma:migrate:dev
pnpm --filter @timelend/database prisma:migrate:deploy
pnpm --filter @timelend/database prisma:push
pnpm --filter @timelend/database prisma:studio
pnpm --filter @timelend/database build
```

## Environment Variables

Copy `database/.env.example` to `database/.env`.

Required values:

- `DATABASE_URL`: pooled connection string for runtime
- `DIRECT_URL`: direct connection string for Prisma migrations

## Recommended Workflow

Local development:

```bash
pnpm db:generate
pnpm db:migrate:dev
```

Production deployment:

```bash
pnpm db:migrate:deploy
```

## Notes

- Neon is the expected production database target
- Migration history is tracked under `database/prisma/migrations`
- The generated Prisma client is consumed by the backend through the `@timelend/database` workspace package
