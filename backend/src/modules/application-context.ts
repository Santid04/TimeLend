/**
 * This file creates the singleton dependency graph for the backend runtime.
 * It exists to centralize service, controller and middleware wiring in one audited place.
 * It fits the system by keeping app composition explicit while avoiding duplicate background loops and hot-wallet clients.
 */
import { AutomationController } from "../controllers/automation.controller";
import { AuthController } from "../controllers/auth.controller";
import { CommitmentController } from "../controllers/commitment.controller";
import { SystemController } from "../controllers/system.controller";
import { createAutomationAuthMiddleware } from "../middlewares/automation-auth";
import { createAuthenticationMiddleware } from "../middlewares/authenticate";
import { createInternalAuthMiddleware } from "../middlewares/internal-auth";
import { AiService } from "../services/ai.service";
import { AuthService } from "../services/auth.service";
import { CommitmentService } from "../services/commitment.service";
import { ContractService } from "../services/contract.service";
import { EvidenceService } from "../services/evidence.service";
import { StorageService } from "../services/storage.service";
import { SystemService } from "../services/system.service";
import { TokenService } from "../services/token.service";

export type ApplicationContext = {
  automationController: AutomationController;
  authController: AuthController;
  authenticate: ReturnType<typeof createAuthenticationMiddleware>;
  commitmentController: CommitmentController;
  commitmentService: CommitmentService;
  requireAutomation: ReturnType<typeof createAutomationAuthMiddleware>;
  requireInternal: ReturnType<typeof createInternalAuthMiddleware>;
  systemController: SystemController;
};

let cachedContext: ApplicationContext | null = null;

/**
 * This function creates or reuses the shared backend application context.
 * It receives no parameters because every dependency reads from validated configuration.
 * It returns the singleton application context for the current process.
 * It is important because the backend should not accidentally create multiple queues, hot wallets or maintenance loops.
 */
export function getApplicationContext(): ApplicationContext {
  if (cachedContext !== null) {
    return cachedContext;
  }

  const tokenService = new TokenService();
  const authService = new AuthService(tokenService);
  const systemService = new SystemService();
  const contractService = new ContractService();
  const aiService = new AiService();
  const evidenceService = new EvidenceService();
  const storageService = new StorageService();
  const commitmentService = new CommitmentService(
    contractService,
    aiService,
    evidenceService,
    storageService,
  );

  cachedContext = {
    automationController: new AutomationController(commitmentService),
    authController: new AuthController(authService),
    authenticate: createAuthenticationMiddleware(tokenService),
    commitmentController: new CommitmentController(commitmentService),
    commitmentService,
    requireAutomation: createAutomationAuthMiddleware(),
    requireInternal: createInternalAuthMiddleware(),
    systemController: new SystemController(systemService),
  };

  return cachedContext;
}
