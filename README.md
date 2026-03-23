<!-- This file introduces the TimeLend monorepo at the repository root. -->
<!-- It exists to give contributors a quick entry point before they open module-level docs. -->
<!-- It fits the system by summarizing the workspace layout, core commands and documentation map. -->
# TimeLend

TimeLend es una plataforma donde un usuario crea un compromiso personal, bloquea fondos como garantía, sube evidencia cuando afirma haber cumplido y delega la verificación al backend y a la IA antes de liberar o redirigir los fondos.

Este repositorio contiene el scaffold inicial de producción para las siguientes capas:

- `frontend`: aplicación Next.js demo preparada para ser evolucionada por v0.
- `backend`: API Express en TypeScript preparada para autenticación wallet, IA, uploads y blockchain.
- `smartContract`: proyecto Hardhat con un contrato placeholder y scripts de exportación de ABI.
- `database`: paquete Prisma/PostgreSQL con modelos iniciales.
- `shared`: tipos, DTOs, enums, constantes y esquemas reutilizables.
- `docs`: documentación de arquitectura, flujo y setup.

## Comandos principales

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
```

## Documentación

- [Visión general](./docs/README.md)
- [Arquitectura](./docs/architecture/overview.md)
- [Flujo del sistema](./docs/architecture/system-flow.md)
- [Setup local](./docs/development/setup.md)
