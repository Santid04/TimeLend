<!-- This file documents the purpose of the shared workspace. -->
<!-- It exists to explain what belongs in shared code and what should stay in app-specific modules. -->
<!-- It fits the system by preventing data contracts from drifting between layers. -->
# Shared

Este paquete concentra contratos reutilizables entre frontend, backend y futuras herramientas auxiliares.

## Contenido actual

- constantes de aplicación
- enums base del dominio
- tipos y DTOs iniciales
- esquemas Zod placeholder
- placeholders para ABI exportada

## Regla de uso

Todo lo que describa contratos de datos compartidos debe vivir acá antes de duplicarse en otras capas.
