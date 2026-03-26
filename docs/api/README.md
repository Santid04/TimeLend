# TimeLend API Reference

Base backend URLs:

- Local: `http://localhost:4000/api`
- Vercel: `https://<backend-project>.vercel.app/api`

## Error Format

All routes return JSON errors in the following shape:

```json
{
  "code": "STRING_CODE",
  "message": "Human readable message",
  "details": {}
}
```

## Public Endpoints

- `GET /api/health`
  Returns service health information.
- `GET /api/version`
  Returns backend version and runtime metadata.
- `POST /api/auth/challenge`
  Body: `{ "walletAddress": "0x..." }`
  Issues the wallet challenge to be signed.
- `POST /api/auth/verify-signature`
  Body: `{ "walletAddress": "0x...", "signature": "0x..." }`
  Verifies the signed challenge and returns a JWT.

## Authenticated Endpoints

These routes require `Authorization: Bearer <jwt>`.

- `POST /api/commitments`
  Registers an off-chain commitment that already exists on-chain.
- `GET /api/commitments/:wallet`
  Lists commitments owned by the authenticated wallet.
- `POST /api/commitments/:id/evidence`
  Multipart form-data endpoint. Accepts `file` (`.pdf` or `.txt`) and/or `textEvidence`.
- `POST /api/commitments/:id/verify`
  Queues the initial verification workflow.
- `POST /api/commitments/:id/appeal`
  Registers an appeal that the user already consumed on-chain.

## Internal Endpoints

These routes require `x-internal-api-key: <INTERNAL_API_KEY>`.

- `POST /api/commitments/:id/resolve-appeal`
  Triggers appeal resolution.
- `POST /api/commitments/:id/finalize-failed`
  Finalizes a failed commitment without appeal.
- `POST /api/commitments/:id/finalize`
  Compatibility alias for `finalize-failed`.

## Automation Endpoints

These routes accept either:

- `x-internal-api-key: <INTERNAL_API_KEY>`
- `Authorization: Bearer <CRON_SECRET>`

Routes:

- `GET /api/automation/finalize-expired-failures`
- `POST /api/automation/finalize-expired-failures`

Example response:

```json
{
  "failed": 0,
  "finalized": 0,
  "scanned": 0,
  "status": "ok",
  "timestamp": "2026-03-24T00:00:00.000Z"
}
```
