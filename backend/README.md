# Backend

The backend workspace contains the TimeLend HTTP API and application orchestration layer. It is responsible for wallet authentication, off-chain persistence, evidence ingestion, AI verification, privileged blockchain actions, and automation endpoints.

## Responsibilities

- Issue and verify wallet authentication challenges
- Persist commitment metadata, evidence, verification history, and lifecycle events
- Synchronize off-chain state with the on-chain contract
- Trigger AI verification flows
- Execute or coordinate privileged settlement actions with the system wallet
- Expose internal and automation endpoints for appeals and failed finalization

## Lifecycle Model

The backend uses PostgreSQL as the source of truth for logical workflow state while the contract remains the source of truth for funds.

Supported statuses:

- `ACTIVE`
- `FAILED_PENDING_APPEAL`
- `COMPLETED`
- `FAILED_FINAL`

## API Surface

Public endpoints:

- `GET /api/health`
- `GET /api/version`
- `POST /api/auth/challenge`
- `POST /api/auth/verify-signature`

Authenticated endpoints:

- `POST /api/commitments`
- `GET /api/commitments/:wallet`
- `POST /api/commitments/:id/evidence`
- `POST /api/commitments/:id/verify`
- `POST /api/commitments/:id/appeal`

Internal endpoints:

- `POST /api/commitments/:id/resolve-appeal`
- `POST /api/commitments/:id/finalize-failed`
- `POST /api/commitments/:id/finalize`

Automation endpoints:

- `GET /api/automation/finalize-expired-failures`
- `POST /api/automation/finalize-expired-failures`

Additional details are available in [docs/api/README.md](../docs/api/README.md).

## Key Directories

- `src/config`: environment validation and shared runtime config
- `src/routes`: route registration modules
- `src/controllers`: HTTP controllers and response shaping
- `src/services`: application and domain orchestration
- `src/jobs`: in-memory and serverless background work helpers
- `src/middlewares`: auth, validation, upload, and error handling
- `src/modules`: dependency graph composition
- `src/utils`: internal helpers

## Environment Variables

Copy `backend/.env.example` to `backend/.env`.

Key values:

- `FRONTEND_APP_URL`: exact frontend origin or comma-separated list of allowed origins
- `DATABASE_URL`: runtime PostgreSQL connection string
- `PRIVATE_KEY`: system wallet private key
- `RPC_URL`: Avalanche Fuji RPC endpoint
- `TIME_LEND_CONTRACT_ADDRESS`: deployed contract address
- `JWT_SECRET`: wallet auth signing secret
- `INTERNAL_API_KEY`: secret for internal-only routes
- `CRON_SECRET`: secret for automation endpoints

## Local Development

From the monorepo root:

```bash
pnpm install
pnpm --filter backend dev
```

Validation commands:

```bash
pnpm --filter backend lint
pnpm --filter backend typecheck
pnpm --filter backend build
```

## Deployment Notes

The backend is designed for a dedicated Vercel project with `Root Directory = backend`.

For preview and production:

- `FRONTEND_APP_URL` must include every frontend origin that should be allowed by CORS
- Preview deployments often require adding the temporary Vercel frontend URL explicitly
- Frontend authentication calls will fail at network level if the frontend origin is not allowed by CORS
