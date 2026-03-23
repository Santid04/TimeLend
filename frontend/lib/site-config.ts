/**
 * This file stores static copy and labels for the frontend scaffold.
 * It exists to keep route files thin and easy to replace later.
 * It fits the system by centralizing presentation-level constants that v0 can refactor safely.
 */
import type { DemoFeature } from "@/types/frontend";

/**
 * This constant defines the high-level identity of the frontend demo.
 * It receives no input and is loaded statically.
 * It returns the main copy values used by the landing page.
 * It is important because it separates content configuration from component logic.
 */
export const siteConfig = {
  name: "TimeLend",
  description:
    "Scaffold base del frontend. Próximamente integración wallet, dashboard del compromiso y estados de verificación.",
  roadmapLabel: "Wallet connect + dashboard inicial"
} as const;

/**
 * This constant lists the near-term modules that the UI will eventually expose.
 * It receives no input and is loaded statically.
 * It returns the feature cards rendered on the demo homepage.
 * It is important because it communicates the intended growth path without implementing the final product yet.
 */
export const demoFeatures: DemoFeature[] = [
  {
    phase: "Prompt 3",
    title: "API real",
    description: "Autenticación wallet, compromisos y resolución de evidencia."
  },
  {
    phase: "Prompt 4",
    title: "Persistencia",
    description: "Expansión de Prisma, estados de revisión y trazabilidad completa."
  },
  {
    phase: "Prompt 5",
    title: "UX funcional",
    description: "Dashboard, formularios, carga de evidencia y visibilidad del ciclo de vida."
  }
];
