# Base De Datos Y Migraciones

## Neon recomendado

Para produccion:

- `DATABASE_URL`
  usar la connection string pooled de Neon para runtime serverless.
- `DIRECT_URL`
  usar la connection string directa para migraciones Prisma.

El schema Prisma ya quedo preparado con:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Comandos

Generar cliente:

```bash
pnpm --filter @timelend/database prisma:generate
```

Aplicar migraciones en produccion:

```bash
pnpm --filter @timelend/database prisma:migrate:deploy
```

Build del paquete database:

```bash
pnpm --filter @timelend/database build
```

## Flujo recomendado de release

1. Configurar `DATABASE_URL` y `DIRECT_URL`.
2. Correr `prisma migrate deploy`.
3. Deployar backend.
4. Deployar frontend.

## Verificacion

- revisar que `GET /api/health` responda
- pedir un challenge wallet
- crear un commitment y confirmar que se persiste en Postgres
- subir evidencia y verificar que `Evidence.fileUrl` quede persistido
