<!-- This file documents the scope and structure of the backend workspace. -->
<!-- It exists to explain how the backend orchestrates auth, AI, uploads, database state and blockchain resolution. -->
<!-- It fits the system by making the core application layer of TimeLend auditable and maintainable. -->

# Backend

API Express modular adaptada a Vercel Functions con rutas bajo `/api/*`.

## Flujo on-chain soportado

- `createCommitment` es una transaccion firmada por la wallet del usuario contra el contrato.
- El backend no vuelve a crear el commitment on-chain: valida el `onchainId` recibido y sincroniza la metadata off-chain.
- `appeal` tambien nace on-chain desde la wallet del usuario; el backend registra esa apelacion en la base luego de verificar el estado real del contrato.
- `markCompleted`, `markFailed`, `resolveAppeal` y `finalizeFailedCommitment` son llamadas exclusivas de la wallet del sistema.
- `markFailedFinal` permite cerrar y pagar inmediatamente los failures claros que no admiten apelacion.
- El backend persiste metadata off-chain, evidencia, verificaciones de IA, historial de eventos y hashes de transacciones.
- En local, la verificacion y la resolucion de apelaciones usan una cola en memoria.
- En Vercel, esas mismas acciones usan background work serverless con `waitUntil()`.
- La base de datos es la source of truth del estado logico del producto, mientras que el contrato sigue siendo la source of truth de los fondos.

## Estructura base

- `src/config`: variables de entorno y utilidades transversales
- `src/routes`: definicion de endpoints
- `src/controllers`: capa HTTP y serializacion de respuestas
- `src/services`: logica de aplicacion reusable
- `src/jobs`: cola simple y procesos en segundo plano
- `src/middlewares`: auth, validacion, uploads, errores y rutas no encontradas
- `src/modules`: composicion del grafo de dependencias
- `src/utils`: helpers internos
- `src/types`: contratos internos del backend
- `api`: entrypoint catch-all para Vercel

## Endpoints principales

- `GET /api/health`
- `GET /api/version`
- `POST /api/auth/challenge`
- `POST /api/auth/verify-signature`
- `POST /api/commitments`
- `GET /api/commitments/:wallet`
- `POST /api/commitments/:id/evidence`
- `POST /api/commitments/:id/verify`
- `POST /api/commitments/:id/appeal`
- `POST /api/commitments/:id/resolve-appeal`
- `POST /api/commitments/:id/finalize-failed`
- `GET /api/automation/finalize-expired-failures`

## Flujo de persistencia

- `ACTIVE`: el commitment existe on-chain y ya fue sincronizado a PostgreSQL.
- `FAILED_PENDING_APPEAL`: el backend marco fallo en el contrato y todavia existe una ventana de apelacion.
- `COMPLETED`: el backend resolvio exito inicial o de apelacion y el contrato devolvio fondos al usuario.
- `FAILED_FINAL`: el contrato ya resolvio definitivamente el fallo por rechazo de apelacion o finalizacion sin apelacion.

## Idempotencia y consistencia

- `isProcessing` y `processingStartedAt` bloquean dobles verificaciones, dobles resoluciones y dobles finalizaciones.
- Cada cambio importante se registra en `CommitmentEvent` para auditoria.
- Cada decision de IA se persiste en `Verification` con `type`, `confidence`, `reasoning`, `provider`, `model` y `rawResponse`.
- El backend consulta el contrato antes de aceptar el sync inicial y antes de registrar una apelacion, para no guardar metadata inconsistente.

## Variables de entorno clave

- `DATABASE_URL`
- `RPC_URL`
- `PRIVATE_KEY`
- `TIME_LEND_CONTRACT_ADDRESS`
- `GEMINI_API_KEY`
- `JWT_SECRET`
- `INTERNAL_API_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `CRON_SECRET`

## Comandos utiles

```bash
pnpm --filter @timelend/database prisma:generate
pnpm --filter @timelend/database prisma:migrate:deploy
pnpm --filter backend dev
pnpm --filter backend lint
pnpm --filter backend typecheck
pnpm --filter backend build
```
