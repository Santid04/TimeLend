<!-- This file documents the expected functional flow of TimeLend. -->
<!-- It exists to align future implementations around the same end-to-end lifecycle. -->
<!-- It fits the system by turning the product idea into an auditable technical sequence. -->
# Flujo Esperado del Sistema

## Flujo de alto nivel

1. El usuario conecta su wallet desde el frontend.
2. El frontend solicita al backend el inicio de sesión o la validación del usuario.
3. El usuario crea un compromiso con monto, deadline y wallet destino en caso de fallo.
4. El backend valida datos, registra persistencia y prepara la operación blockchain.
5. El backend, usando la wallet del sistema, interactúa con el smart contract.
6. El usuario sube evidencia al declarar que cumplió la tarea.
7. El backend envía la evidencia al motor de IA para revisión.
8. Si la IA aprueba, el backend marca el commitment como completado y el contrato devuelve los fondos al usuario.
9. Si la IA rechaza, el backend marca el commitment como fallido y se abre una única ventana de apelación.
10. Si el usuario apela, el backend resuelve la apelación y el contrato libera fondos al usuario o al destino de fallo.
11. Si no hay apelación y vence la ventana, el backend finaliza el fallo y el contrato redirige los fondos al destino configurado.

## Qué queda implementado ahora

- estructura técnica del monorepo
- frontend demo mínimo
- backend con endpoints de salud y versión
- contrato on-chain completo con stake, resolución y apelación
- esquema Prisma inicial
- paquete shared para reutilización futura

## Qué queda pendiente para etapas siguientes

- autenticación wallet real
- contratos con lógica completa
- persistencia completa de evidencia y apelaciones
- integración IA real
- panel de usuario
- observabilidad y despliegue final
