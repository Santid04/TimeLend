<!-- This file explains why the repository folders exist and how they should evolve. -->
<!-- It exists to keep future contributors from inventing parallel structures. -->
<!-- It fits the system by making the monorepo growth path explicit from day one. -->
# Estructura de Carpetas

## Workspaces principales

- `frontend`: UI Next.js y capas de presentación.
- `backend`: API HTTP, orquestación y lógica off-chain.
- `smartContract`: contratos, scripts y tests on-chain.
- `database`: Prisma schema, cliente y utilidades de persistencia.
- `shared`: contratos de datos compartidos entre capas.

## Carpetas de soporte

- `docs`: documentación del proyecto.

## Criterios de crecimiento

- agregar nuevas features en carpetas específicas por responsabilidad
- evitar lógica de negocio en componentes visuales
- mantener los contratos de datos en `shared`
- exportar ABI compilada hacia `shared/abi`
- no mezclar persistencia, transporte HTTP y lógica del dominio en el mismo archivo
