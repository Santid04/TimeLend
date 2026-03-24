# API TimeLend

Base URL del backend:

- local: `http://localhost:4000/api`
- produccion: `https://<backend-project>.vercel.app/api`

## Respuesta de error

Todas las rutas devuelven errores JSON con esta forma:

```json
{
  "code": "STRING_CODE",
  "message": "Human readable message",
  "details": {}
}
```

## Publicas

- `GET /api/health`
  Devuelve estado del servicio.
- `GET /api/version`
  Devuelve version del backend y runtime.
- `POST /api/auth/challenge`
  Body: `{ "walletAddress": "0x..." }`
  Emite el challenge a firmar.
- `POST /api/auth/verify-signature`
  Body: `{ "walletAddress": "0x...", "signature": "0x..." }`
  Verifica la firma y devuelve el JWT.

## Auth por wallet

Estas rutas requieren `Authorization: Bearer <jwt>`.

- `POST /api/commitments`
  Registra off-chain un commitment ya creado on-chain.
- `GET /api/commitments/:wallet`
  Lista commitments de la wallet autenticada.
- `POST /api/commitments/:id/evidence`
  Multipart form-data.
  Campos admitidos: `file` (`.pdf` o `.txt`) y/o `textEvidence`.
- `POST /api/commitments/:id/verify`
  Encola la verificacion inicial.
- `POST /api/commitments/:id/appeal`
  Registra una apelacion ya consumida on-chain por el usuario.

## Internas

Estas rutas requieren `x-internal-api-key: <INTERNAL_API_KEY>`.

- `POST /api/commitments/:id/resolve-appeal`
  Encola la resolucion de apelacion.
- `POST /api/commitments/:id/finalize-failed`
  Finaliza manualmente un failure sin apelacion.
- `POST /api/commitments/:id/finalize`
  Alias de compatibilidad hacia `finalize-failed`.

## Automatizacion

Estas rutas aceptan:

- `x-internal-api-key: <INTERNAL_API_KEY>`
- o `Authorization: Bearer <CRON_SECRET>`

Rutas:

- `GET /api/automation/finalize-expired-failures`
- `POST /api/automation/finalize-expired-failures`

Respuesta:

```json
{
  "failed": 0,
  "finalized": 0,
  "scanned": 0,
  "status": "ok",
  "timestamp": "2026-03-24T00:00:00.000Z"
}
```
