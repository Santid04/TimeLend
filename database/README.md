<!-- This file documents the role of the database workspace in the TimeLend monorepo. -->
<!-- It exists to explain the persistence model, migration workflow and query patterns. -->
<!-- It fits the system by giving the persistence layer a clear ownership boundary. -->

# Database

Este workspace centraliza Prisma, el esquema relacional completo de TimeLend y el cliente reutilizable para el backend.

## Modelo actual

- `User`: identidad por wallet, nonce de autenticacion y ownership de commitments/evidence.
- `Commitment`: agregado principal off-chain sincronizado con `onchainId`, metadata del producto, estados logicos, tx hashes y lock de idempotencia.
- `Evidence`: archivos y texto extraido usados por la IA.
- `Verification`: decisiones de IA iniciales y de apelacion con reasoning, confidence y respuesta cruda.
- `CommitmentEvent`: historial append-only de transiciones y eventos relevantes.

## Estados

- `ACTIVE`
- `FAILED_PENDING_APPEAL`
- `COMPLETED`
- `FAILED_FINAL`

## Consistencia con contrato

- `Active` on-chain -> `ACTIVE`
- `markFailed` -> `FAILED_PENDING_APPEAL`
- `markCompleted` -> `COMPLETED`
- `resolveAppeal(true)` -> `COMPLETED`
- `resolveAppeal(false)` -> `FAILED_FINAL`
- `finalizeFailedCommitment` -> `FAILED_FINAL`

## Comandos utiles

```bash
pnpm --filter @timelend/database prisma:generate
pnpm --filter @timelend/database prisma:migrate:dev
pnpm --filter @timelend/database prisma:migrate:deploy
pnpm --filter @timelend/database prisma:push
pnpm --filter @timelend/database build
```

## Produccion con Neon

- `DATABASE_URL`: URL pooled para runtime serverless.
- `DIRECT_URL`: URL directa para `prisma migrate deploy`.

## Nota de migracion local

- Si tu base local venia de una version previa creada con `prisma db push`, Prisma puede detectar drift al correr `migrate dev`.
- En ese caso, para un entorno de desarrollo desechable, lo correcto es resetear y volver a aplicar:

```bash
pnpm --filter @timelend/database exec prisma migrate reset
pnpm --filter @timelend/database prisma:migrate:dev
```

## Ejemplos de consultas

```ts
const commitment = await prisma.commitment.findUnique({
  where: { id: commitmentId },
  include: {
    evidences: { orderBy: { createdAt: "desc" } },
    events: { orderBy: { createdAt: "desc" } },
    user: true,
    verifications: { orderBy: { createdAt: "desc" } },
  },
});
```

```ts
const pendingFinalizations = await prisma.commitment.findMany({
  where: {
    appealWindowEndsAt: { lte: new Date() },
    appealed: false,
    isProcessing: false,
    status: "FAILED_PENDING_APPEAL",
  },
});
```

## Evolucion prevista

- migraciones incrementales por nuevas reglas de negocio
- almacenamiento externo de evidencias
- jobs persistentes o colas distribuidas
- analytics y reporting de decisiones y verificaciones
