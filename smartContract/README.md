<!-- This file documents the definitive smart contract layer of TimeLend. -->
<!-- It exists to explain the production-oriented design choices used in the contract, tests and deploy workflow. -->
<!-- It fits the system by giving backend and frontend teams one clear on-chain contract to integrate with. -->
# Smart Contract

Este workspace usa `Hardhat + Solidity` para la capa on-chain definitiva de `TimeLend`.

## Contrato principal

- `contracts/TimeLend.sol`

## Capacidades actuales

- creación de commitments con stake nativo
- custodia on-chain de fondos
- resolución exitosa por backend
- flujo de fallo con ventana de apelación
- una única apelación por commitment
- finalización segura de fallos
- control de acceso por backend rotado por owner
- exportación de ABI compartida hacia `shared/abi/TimeLend.json`

## Nota de diseño importante

Para que una apelación exitosa sea posible sin dejar al contrato insolvente, `markFailed` no libera fondos inmediatamente. En cambio:

1. el backend marca el failure
2. se abre una ventana de apelación
3. si el usuario apela, el backend resuelve la apelación
4. si no apela, el backend finaliza el failure y recién ahí se paga al `failReceiver`

Esta extensión es deliberada y necesaria para un sistema seguro.

## Comandos

```bash
pnpm --filter smartContract compile
pnpm --filter smartContract test
pnpm --filter smartContract abi:export
pnpm --filter smartContract deploy:fuji
```
