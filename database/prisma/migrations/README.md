# Prisma Migrations

This directory contains the versioned Prisma migration history for the TimeLend database schema.

## Purpose

- Track schema evolution over time
- Support reproducible local environments
- Enable controlled production deployments through `prisma migrate deploy`

Generate new migrations with:

```bash
pnpm --filter @timelend/database prisma:migrate:dev
```
