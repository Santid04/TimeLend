<!-- This file documents the initial API surface exposed by the backend scaffold. -->
<!-- It exists to give frontend and integration work a stable starting contract. -->
<!-- It fits the system by clarifying what is already available and what is intentionally pending. -->
# API Inicial

## Endpoints disponibles

### `GET /health`

Entrega un payload simple para confirmar que el backend está arriba.

Ejemplo esperado:

```json
{
  "status": "ok",
  "service": "TimeLend API",
  "timestamp": "2026-03-23T00:00:00.000Z"
}
```

### `GET /version`

Entrega metadatos mínimos de versión del backend.

Ejemplo esperado:

```json
{
  "name": "timelend-backend",
  "version": "0.1.0",
  "apiVersion": "v1"
}
```

## Próximos endpoints previstos

- autenticación por wallet
- creación y consulta de compromisos
- carga de evidencia
- estado de revisión IA
- apelaciones
- administración de resolución blockchain
