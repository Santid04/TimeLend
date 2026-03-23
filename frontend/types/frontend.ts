/**
 * This file declares frontend-specific view model types.
 * It exists to keep component contracts explicit even in the demo phase.
 * It fits the system by giving future UI refactors a typed surface to evolve safely.
 */
export type DemoFeature = {
  description: string;
  phase: string;
  title: string;
};
