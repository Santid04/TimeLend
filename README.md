<!-- This file introduces the TimeLend monorepo at the repository root. -->
<!-- It exists to give contributors a quick entry point before they open module-level docs. -->
<!-- It fits the system by summarizing the workspace layout, core commands and documentation map. -->
# TimeLend

TimeLend es una plataforma donde un usuario crea un compromiso personal, bloquea fondos como garantia, sube evidencia cuando afirma haber cumplido y delega la verificacion al backend y a la IA antes de liberar o redirigir los fondos.

Este repositorio contiene la base de produccion del proyecto en las siguientes capas:

- `frontend`: aplicacion Next.js demo preparada para ser evolucionada por v0.
- `backend`: API Express en TypeScript con auth por wallet, relay seguro de transacciones, IA, uploads y orquestacion blockchain.
- `smartContract`: proyecto Hardhat con el contrato TimeLend completo, tests y export de ABI compartida.
- `database`: paquete Prisma/PostgreSQL con modelos para usuarios, commitments, evidencia y verificaciones.
- `shared`: tipos, DTOs, enums, constantes, esquemas y ABI reutilizables.
- `docs`: documentacion de arquitectura, flujo y setup.

## Comandos principales

```bash
pnpm install
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm dev
```

## Documentacion

- [Vision general](./docs/README.md)
- [Arquitectura](./docs/architecture/overview.md)
- [Flujo del sistema](./docs/architecture/system-flow.md)
- [Setup local](./docs/development/setup.md)

# Tareas a realizar
- Mostrar avisos de "Cargar evidencia" cuando se pueda apelar
- Mover base de datos, urls, y todo lo necesario para que la pagina no corra localmente
- Realizar la pagina con v0