<!-- This file documents the role of the database workspace in the TimeLend monorepo. -->
<!-- It exists to explain what is already modeled and what will expand in later prompts. -->
<!-- It fits the system by giving the persistence layer a clear ownership boundary. -->
# Database

Este workspace centraliza Prisma, el esquema relacional inicial y el cliente reutilizable para el backend.

## Estado actual

- datasource PostgreSQL configurado
- modelos base `User` y `Commitment`
- enum de estado inicial
- cliente Prisma reusable

## Evolución prevista

- evidencia y apelaciones
- auditoría de decisiones IA
- historial de transacciones
- sincronización con contratos y resoluciones on-chain
