/**
 * This file defines a small status panel for the frontend scaffold.
 * It exists to demonstrate how future client-side status widgets can be composed.
 * It fits the system by reserving a clear place for dashboard-like cards without committing to final UI logic.
 */
"use client";

import { useDemoStatus } from "@/hooks/use-demo-status";

/**
 * This component renders a client-side status summary for the demo application.
 * It receives no props because the status is derived from local hook state.
 * It returns a small informational card.
 * It is important because it proves the scaffold is ready for interactive React components.
 */
export function DemoStatusCard() {
  const { label, message } = useDemoStatus();

  return (
    <section className="status-card" aria-label="Estado del demo">
      <p className="eyebrow">Próximamente</p>
      <h2>Próximamente integración wallet y dashboard</h2>
      <p>{message}</p>
      <span className="status-pill">{label}</span>
    </section>
  );
}
