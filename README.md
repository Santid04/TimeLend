# TimeLend

TimeLend es una plataforma donde un usuario bloquea fondos en Avalanche Fuji, registra metadata off-chain, sube evidencia y deja que el backend resuelva el lifecycle con IA, contrato y Postgres como partes coordinadas.

## Workspaces

- `frontend`: Next.js demo listo para Vercel y preparado para que v0 solo mejore la UI.
- `backend`: Express modular adaptado a Vercel Functions bajo `/api/*`.
- `database`: Prisma + PostgreSQL/Neon.
- `smartContract`: Hardhat + Solidity para Avalanche Fuji.
- `shared`: ABI y contratos compartidos.
- `docs`: deploy, variables, migraciones, API y checklist de demo.

## Comandos principales

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm db:migrate:deploy
```

## Documentacion

- [Deploy en Vercel](./docs/deploy/vercel.md)
- [Variables de entorno](./docs/deploy/environment-variables.md)
- [Base de datos y migraciones](./docs/deploy/database-and-migrations.md)
- [API](./docs/api/README.md)
- [Checklist de demo](./docs/demo/testing-checklist.md)
