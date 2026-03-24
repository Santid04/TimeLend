# Variables De Entorno

## Frontend publicas

Estas se cargan en el proyecto `frontend` y quedan expuestas al navegador.

- `NEXT_PUBLIC_API_URL`
  URL publica del backend terminada en `/api`.
  Ejemplo: `https://timelend-backend.vercel.app/api`
- `NEXT_PUBLIC_RPC_URL`
  RPC de Avalanche Fuji.
- `NEXT_PUBLIC_CONTRACT_ADDRESS`
  Address desplegada del contrato.
- `NEXT_PUBLIC_SYSTEM_FAIL_RECEIVER`
  Wallet publica que el checkbox del form usa como `failReceiver`.
- `NEXT_PUBLIC_APP_NAME`
  Opcional. Solo branding.

## Frontend privadas

Estas van en el mismo proyecto `frontend` pero solo se usan en el servidor Next.

- `INTERNAL_API_KEY`
  Permite que las routes internas del frontend llamen endpoints internos del backend sin exponer la key al browser.

## Backend privadas

Estas van en el proyecto `backend` y nunca deben exponerse al navegador.

- `DATABASE_URL`
  URL pooled de Neon para runtime.
- `PRIVATE_KEY`
  Wallet del sistema que ejecuta resoluciones privilegiadas.
- `GEMINI_API_KEY`
  Key de Gemini para la evaluacion IA.
- `JWT_SECRET`
  Secreto de firma de sesiones wallet.
- `INTERNAL_API_KEY`
  Secreto para endpoints internos y proxies del frontend.
- `CRON_SECRET`
  Secreto que Vercel Cron envia como `Authorization: Bearer ...`.
- `BLOB_READ_WRITE_TOKEN`
  Token de Vercel Blob para persistir evidencia.

## Backend no publicas pero no secretas

Siguen yendo en el proyecto `backend`, aunque no son credenciales.

- `FRONTEND_APP_URL`
  Origin permitido por CORS.
  Puede ser una sola URL o una lista separada por comas.
- `RPC_URL`
  RPC de Avalanche Fuji usado por ethers.
- `TIME_LEND_CONTRACT_ADDRESS`
  Address del contrato productivo.
- `AVALANCHE_CHAIN_ID`
  `43113` para Fuji.
- `APP_NAME`
  Opcional.
- `API_VERSION`
  Opcional.
- `JWT_EXPIRES_IN`
  Opcional.
- `AUTH_CHALLENGE_TTL_MINUTES`
  Opcional.
- `MAX_UPLOAD_SIZE_BYTES`
  Opcional.
- `UPLOAD_DIR`
  Solo fallback local, no se usa como storage productivo en Vercel.
- `FAILED_FINALIZATION_INTERVAL_MS`
  Solo afecta el loop local.

## Database

Estas pueden vivir en tu shell/CI y tambien conviene tenerlas en el proyecto `backend` para operaciones administrativas.

- `DATABASE_URL`
  URL pooled de Neon.
- `DIRECT_URL`
  URL directa sin pooler para `prisma migrate deploy`.

## Smart contract

- `FUJI_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- `INITIAL_OWNER_ADDRESS`
- `BACKEND_WALLET_ADDRESS`
- `APPEAL_WINDOW_SECONDS`

## Resumen rapido

- publicas:
  solo las `NEXT_PUBLIC_*`.
- privadas:
  todo lo demas.
