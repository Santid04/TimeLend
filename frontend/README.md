<!-- This file documents the functional demo frontend for TimeLend. -->
<!-- It exists to explain the exact local setup, real flow and environment variables used by the Next.js app. -->
<!-- It fits the system by making the demo UI easy to run while preserving the existing backend and contract architecture. -->

# Frontend

Este workspace contiene el frontend DEMO funcional de `TimeLend`. No es el producto final ni la UI definitiva, pero ya permite recorrer el flujo real del sistema para testing end-to-end.

## Alcance del demo

La app permite:

- conectar wallet con `wagmi`
- autenticarse contra el backend por firma
- crear un commitment on-chain llamando `createCommitment`
- registrar ese commitment en el backend
- listar commitments del usuario
- subir evidencia `.txt` o `.pdf`
- pedir verificación
- apelar un fallo
- resolver apelaciones y finalizar fallos desde controles de demo internos

## Estructura

- `app`: rutas App Router y proxies internos del demo
- `components`: UI mínima para formularios y dashboard
- `hooks`: estado de wallet, sesión y polling del dashboard
- `lib`: configuración de entorno, `wagmi` y helpers compartidos
- `services`: integración con backend y contrato
- `types`: tipos del frontend consumidos por la demo

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá:

```env
NEXT_PUBLIC_APP_NAME=TimeLend Demo
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_SYSTEM_FAIL_RECEIVER=0xC6C9237FbBC370A898366615eAFcBf0a57Bc72a0
INTERNAL_API_KEY=tu_clave_interna_del_backend
```

Notas:

- `NEXT_PUBLIC_*` queda disponible en el navegador.
- `INTERNAL_API_KEY` se usa solo en el servidor Next para proxyear `resolve-appeal` y `finalize-failed`.
- `NEXT_PUBLIC_API_URL` debe apuntar al backend ya con el prefijo `/api`.
- `NEXT_PUBLIC_SYSTEM_FAIL_RECEIVER` define la wallet que recibira fondos al finalizar un failure sin apelacion exitosa.
- El contrato debe estar desplegado y la address debe coincidir con `NEXT_PUBLIC_CONTRACT_ADDRESS`.

## Flujo real del demo

1. Conectar wallet
2. Autenticarse con firma
3. Crear commitment on-chain desde la wallet del usuario
4. Registrar metadata en el backend
5. Subir evidencia
6. Pedir verificación
7. Refrescar dashboard hasta ver el nuevo estado
8. Si falla, apelar y luego resolver apelación o finalizar el fallo

## Importante sobre apelaciones

El backend actual solo registra una apelación si ya existe on-chain. Por eso, en este demo la apelación hace dos pasos:

1. llama `appeal()` con la wallet del usuario
2. sincroniza ese cambio con `POST /commitments/:id/appeal`

Eso mantiene compatibilidad con la arquitectura real existente sin cambiar el backend.

## Comandos

Desde la raíz del monorepo:

```bash
pnpm install
pnpm --filter frontend dev
```

Validación:

```bash
pnpm --filter frontend lint
pnpm --filter frontend typecheck
pnpm --filter frontend build
```

## Requisitos previos

- backend levantado y funcional
- contrato `TimeLend` desplegado
- wallet del sistema ya configurada como `backend` en el contrato
- base de datos lista y migraciones aplicadas
- MetaMask o provider compatible instalado en el navegador
