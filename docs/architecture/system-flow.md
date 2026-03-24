# Flujo del sistema

## End-to-end implementado

1. El usuario conecta su wallet en el frontend.
2. El frontend pide un challenge al backend y la wallet firma el mensaje.
3. El frontend crea el commitment on-chain en Avalanche Fuji usando la wallet del usuario.
4. El frontend sincroniza ese commitment en el backend, que valida el `onchainId` contra el contrato.
5. El usuario sube evidencia como archivo `.pdf` o `.txt`, texto libre, o ambos.
6. El backend persiste la evidencia en Postgres y guarda el archivo en storage persistente.
7. El backend ejecuta la verificacion con Gemini si hay `GEMINI_API_KEY`; si no, usa el evaluador mock para demo.
8. Segun el resultado:
   `success`: el backend llama `markCompleted` y actualiza la DB a `COMPLETED`.
   `fail` incierto: el backend llama `markFailed` y abre la ventana de apelacion.
   `fail` claro: el backend llama `markFailedFinal` y paga inmediatamente al `failReceiver`.
9. Si el usuario apela:
   primero consume `appeal()` on-chain desde la wallet.
   luego sincroniza la apelacion en el backend.
10. El backend resuelve la apelacion con IA y llama `resolveAppeal`.
11. Si no hay apelacion y vence la ventana, el backend puede cerrar el caso por:
    boton interno de demo.
    cron productivo en Vercel.
12. El frontend refresca el dashboard y refleja el nuevo estado, hashes de tx, evidencias y reasoning.

## Modos de ejecucion

- desarrollo local:
  verificacion y apelaciones usan una cola en memoria.
  la finalizacion automatica usa un loop local.
- Vercel:
  verificacion y resolucion de apelaciones usan `waitUntil()` para background work serverless.
  la finalizacion automatica usa `Cron Jobs` contra `/api/automation/finalize-expired-failures`.

## Source of truth

- contrato:
  fondos, ownership on-chain, estado financiero definitivo.
- Postgres:
  metadata del commitment, evidencia, verificaciones IA, historial y estado de producto.
