<!-- This file explains how to install and run the TimeLend scaffold locally. -->
<!-- It exists to provide a deterministic onboarding path for contributors. -->
<!-- It fits the system by documenting the local workflow before business features are added. -->
# Setup Local

## Requisitos

- Node.js 20 o superior
- pnpm 9 o superior
- PostgreSQL para etapas con base de datos activa

## Instalación

```bash
pnpm install
```

## Variables de entorno

1. Copiar `frontend/.env.example` a `frontend/.env.local`.
2. Copiar `backend/.env.example` a `backend/.env`.
3. Copiar `database/.env.example` a `database/.env`.
4. Copiar `smartContract/.env.example` a `smartContract/.env`.

## Desarrollo

```bash
pnpm dev
```

Esto levanta:

- frontend demo en `http://localhost:3000`
- backend API en `http://localhost:4000`

## Comandos útiles

```bash
pnpm build
pnpm lint
pnpm test
pnpm db:generate
pnpm contracts:compile
pnpm contracts:test
pnpm contracts:export-abi
pnpm contracts:deploy:fuji
```
