# Deploy En Vercel

TimeLend se despliega como dos proyectos separados dentro del mismo repositorio:

- proyecto 1: `frontend`
- proyecto 2: `backend`

## Prerrequisitos

- contrato `TimeLend` desplegado en Avalanche Fuji
- Neon/Postgres listo
- Vercel Blob creado
- repo conectado a Vercel

## 1. Deploy del backend

1. Crear un nuevo proyecto en Vercel desde este repositorio.
2. Configurar `Root Directory = backend`.
3. Cargar las variables del backend y database descriptas en [environment-variables.md](./environment-variables.md).
4. Deployar.
5. Verificar:
   `https://<backend-project>.vercel.app/api/health`
   `https://<backend-project>.vercel.app/api/version`

Notas:

- `backend/vercel.json` ya deja configurado:
  catch-all serverless bajo `/api/*`
  `maxDuration` de 300s
  cron diario para finalizar fallos expirados
- si usas un plan Pro y queres una finalizacion mas frecuente, cambia el schedule en `backend/vercel.json`.

## 2. Deploy del frontend

1. Crear otro proyecto en Vercel con el mismo repositorio.
2. Configurar `Root Directory = frontend`.
3. Cargar las variables del frontend.
4. En `NEXT_PUBLIC_API_URL` usar la URL del backend terminada en `/api`.
5. Deployar.

## 3. Migraciones

Antes del primer corte a produccion:

```bash
pnpm --filter @timelend/database prisma:generate
pnpm --filter @timelend/database prisma:migrate:deploy
```

Si queres correrlo desde CI o desde tu terminal local usando las envs de produccion, ese es el comando correcto.

## 4. Verificacion post-deploy

1. Abrir el frontend.
2. Conectar wallet en Fuji.
3. Autenticarse por firma.
4. Crear un commitment.
5. Confirmar que aparece en el dashboard.
6. Subir evidencia.
7. Pedir verificacion.
8. Confirmar que la DB y el frontend reflejan el resultado.
9. Probar un failure y el flujo de apelacion.

## 5. Cron productivo

El backend expone:

- `GET /api/automation/finalize-expired-failures`

Ese endpoint acepta `Authorization: Bearer <CRON_SECRET>` y queda listo para que Vercel Cron lo invoque automaticamente.
