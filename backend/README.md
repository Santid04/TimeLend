<!-- This file documents the scope and structure of the backend workspace. -->
<!-- It exists to explain why the API is separated into config, routes, controllers and services. -->
<!-- It fits the system by making future feature growth consistent and auditable. -->
# Backend

Se eligió `Express` por su madurez, su compatibilidad con Vercel Functions y su baja fricción para estructurar una API modular desde el día uno.

## Estructura base

- `src/config`: variables de entorno y utilidades transversales
- `src/routes`: definición de endpoints
- `src/controllers`: capa HTTP y serialización de respuestas
- `src/services`: lógica de aplicación reusable
- `src/middleware`: manejo de errores y rutas no encontradas
- `src/utils`: helpers internos
- `src/types`: contratos internos del backend
- `api`: entrypoint para despliegue futuro en Vercel

## Endpoints actuales

- `GET /health`
- `GET /version`
