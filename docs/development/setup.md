# Setup Local

## Requisitos

- Node.js 20+
- pnpm 9+
- PostgreSQL local o remoto
- contrato TimeLend desplegado en Avalanche Fuji

## Variables de entorno

1. Copiar `frontend/.env.example` a `frontend/.env.local`.
2. Copiar `backend/.env.example` a `backend/.env`.
3. Copiar `database/.env.example` a `database/.env`.
4. Copiar `smartContract/.env.example` a `smartContract/.env`.

Valores locales importantes:

- `frontend/.env.local`
  `NEXT_PUBLIC_API_URL=http://localhost:4000/api`
- `backend/.env`
  `FRONTEND_APP_URL=http://localhost:3000`
- `database/.env`
  `DATABASE_URL` y `DIRECT_URL`

## Prisma

```bash
pnpm --filter @timelend/database prisma:generate
pnpm --filter @timelend/database prisma:migrate:dev
pnpm --filter @timelend/database build
```

## Desarrollo

```bash
pnpm dev
```

Esto levanta:

- frontend: `http://localhost:3000`
- backend: `http://localhost:4000/api`

## Validacion local

```bash
pnpm lint
pnpm typecheck
pnpm build
```
