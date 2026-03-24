<!-- This file documents the definitive smart contract layer of TimeLend. -->
<!-- It exists to explain the production-oriented design choices used in the contract, tests and deploy workflow. -->
<!-- It fits the system by giving backend and frontend teams one clear on-chain contract to integrate with. -->
# Smart Contract

Este workspace usa `Hardhat + Solidity` para la capa on-chain definitiva de `TimeLend`.

## Contrato principal

- `contracts/TimeLend.sol`

## Capacidades actuales

- creacion de commitments con stake nativo
- custodia on-chain de fondos
- resolucion exitosa por backend
- flujo de fallo con ventana de apelacion
- una unica apelacion por commitment
- finalizacion segura de fallos
- control de acceso por backend rotado por owner
- exportacion de ABI compartida hacia `shared/abi/TimeLend.json`

## Nota de diseno importante

Para que una apelacion exitosa sea posible sin dejar al contrato insolvente, el contrato separa dos caminos de failure:

1. si el failure admite apelacion:
   el backend usa `markFailed`
   se abre una ventana de apelacion
   si el usuario apela, el backend resuelve la apelacion
   si no apela, el backend finaliza el failure y recien ahi se paga al `failReceiver`
2. si el failure es definitivo y no admite apelacion:
   el backend usa `markFailedFinal`
   los fondos se transfieren inmediatamente al `failReceiver`

Esta extension es deliberada y necesaria para un sistema seguro.

## Comandos

```bash
pnpm --filter smartContract compile
pnpm --filter smartContract test
pnpm --filter smartContract abi:export
pnpm --filter smartContract deploy:fuji
```

## Nota operativa

- Los tests siempre corren sobre la red local de Hardhat.
- El deploy a Fuji debe ejecutarse de forma explicita con `deploy:fuji`.
- Esto evita que un `.env` local con variables de despliegue rompa la suite de tests.
