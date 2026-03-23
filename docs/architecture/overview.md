<!-- This file explains the high-level architecture chosen for TimeLend. -->
<!-- It exists to document the reasoning behind the monorepo and service boundaries. -->
<!-- It fits the system by aligning future prompts with a stable technical foundation. -->
# Arquitectura General

## Objetivo de esta etapa

Esta primera fase no implementa la lógica completa del negocio. Su propósito es dejar una base consistente, auditable y preparada para crecer sin tener que reescribir la estructura principal.

## Decisiones principales

- Monorepo con `pnpm workspaces` para compartir dependencias, scripts y estándares.
- `Next.js` en `frontend` porque es compatible con Vercel y permite crecer hacia dashboard, marketing y flujos autenticados sin cambiar framework.
- `Express + TypeScript` en `backend` porque ofrece una base muy compatible con Vercel Functions y permite separar claramente middleware, controladores y servicios.
- `Hardhat + Solidity` en `smartContract` porque facilita compilar, testear, desplegar y exportar ABI hacia otras capas.
- `Prisma + PostgreSQL` en `database` para modelado tipado, migraciones y una evolución segura del esquema.
- `shared` como paquete reutilizable para tipos, DTOs, enums, constantes, esquemas y ABI.

## Límite de responsabilidades

- `frontend` renderiza experiencia de usuario y consume la API.
- `backend` orquesta reglas de negocio, seguridad, validación, IA, storage y blockchain.
- `smartContract` contiene la lógica on-chain autorizada.
- el contrato `TimeLend` conserva el stake hasta resolución final y evita liberar fondos de fallo antes de que expire o se resuelva la apelación.
- `database` modela persistencia relacional y expone el cliente Prisma.
- `shared` evita duplicación y deriva tipada entre capas.

## Estrategia de deploy

- `frontend` puede desplegarse como proyecto Next.js en Vercel.
- `backend` queda preparado para desplegarse como proyecto separado en Vercel usando `api/index.ts`.
- `smartContract` y `database` se despliegan fuera de Vercel, pero sus artefactos y contratos quedan listos para integrarse.

## Evolución prevista

Las siguientes etapas podrán agregar:

- login con wallet
- flujo de compromisos completo
- uploads y storage de evidencia
- verificación por IA
- apelaciones
- sincronización blockchain
- dashboard y vistas finales
