# Checklist De Demo

## Antes de empezar

- frontend desplegado
- backend desplegado
- Neon conectado
- Vercel Blob configurado
- contrato Fuji desplegado
- wallet del sistema configurada en el contrato

## Flujo principal

1. Conectar wallet.
2. Autenticarse firmando el challenge.
3. Crear commitment on-chain.
4. Confirmar que el backend lo registra y aparece en dashboard.
5. Subir evidencia.
6. Pedir verificacion.
7. Esperar refresco del dashboard.
8. Validar el resultado final.

## Flujo de failure y apelacion

1. Forzar un caso con evidencia insuficiente.
2. Confirmar estado `FAILED_PENDING_APPEAL`.
3. Ejecutar `appeal()` desde la wallet.
4. Registrar la apelacion en backend.
5. Subir evidencia nueva de apelacion.
6. Resolver apelacion desde el frontend demo.
7. Confirmar `COMPLETED` o `FAILED_FINAL`.

## Qué validar en la demo

- el contrato refleja el estado correcto
- Postgres refleja el mismo lifecycle
- la evidencia guarda `fileUrl` persistente
- las verificaciones guardan `reasoning`, `confidence`, `provider` y `model`
- el frontend muestra errores basicos cuando algo falla
