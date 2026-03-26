# Frontend

The frontend workspace contains the operational TimeLend UI built with Next.js App Router. It provides the complete browser-facing demo for wallet authentication, commitment creation, evidence workflows, and dashboard operations.

## Current Capabilities

- Wallet connection with Wagmi
- Challenge-signature authentication against the backend
- Commitment creation flow with on-chain transaction plus backend registration
- Dashboard for evidence upload, verification, appeal, and failed finalization
- Internal demo proxy routes for privileged backend actions
- Global `EN | ES` toggle for static UI text

## Route Surface

- `/`: home route with wallet session controls and product overview
- `/create`: guided commitment creation flow
- `/dashboard`: commitments dashboard and operational actions
- `/api/internal/...`: server-side proxy routes used for internal-only backend endpoints

## Key Directories

- `app`: App Router routes, layout, and internal Next.js route handlers
- `components`: UI components and route-level content
- `hooks`: wallet session state, dashboard polling, and on-chain action helpers
- `lib`: runtime config, utility functions, wagmi config, and i18n support
- `services`: API and contract integration helpers
- `types`: frontend-facing domain and API types

## Environment Variables

Copy `frontend/.env.example` to `frontend/.env.local` and provide the required values.

```env
NEXT_PUBLIC_APP_NAME=TimeLend Demo
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_SYSTEM_FAIL_RECEIVER=0x...
INTERNAL_API_KEY=...
```

Notes:

- `NEXT_PUBLIC_API_URL` must point to the backend and include the `/api` suffix
- `INTERNAL_API_KEY` is server-only and used by internal Next.js proxy routes
- `NEXT_PUBLIC_SYSTEM_FAIL_RECEIVER` is the default fail receiver shown in the creation flow
- `NEXT_PUBLIC_CONTRACT_ADDRESS` must match the deployed `TimeLend` contract

## Local Development

From the monorepo root:

```bash
pnpm install
pnpm --filter frontend dev
```

Validation commands:

```bash
pnpm --filter frontend lint
pnpm --filter frontend typecheck
pnpm --filter frontend build
```

## Deployment Notes

For Vercel preview or production deployments:

- `NEXT_PUBLIC_API_URL` must reference the backend Vercel project, not the frontend domain
- The backend `FRONTEND_APP_URL` value must allow the exact frontend origin by CORS
- If wallet authentication fails with a network error in preview, the first checks should be the backend URL and CORS origin list

## Functional Notes

- Backend responses, user-generated content, and AI-generated reasoning are rendered as-is
- The UI localization layer only translates static interface text and frontend-defined labels
- Contract interactions remain unchanged; the frontend only orchestrates the browser experience around them
