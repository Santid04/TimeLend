/**
 * This file defines a small hook used by the demo frontend status card.
 * It exists to reserve the hook layer where future frontend logic will live.
 * It fits the system by separating view rendering from reusable client-side state.
 */
"use client";

import { useEffect, useState } from "react";

type DemoStatusState = {
  label: string;
  message: string;
};

/**
 * This hook returns a friendly scaffold status for the current frontend demo.
 * It receives no arguments because the status is derived from the current build stage.
 * It returns a stable label and message pair for UI rendering.
 * It is important because future wallet, API and dashboard hooks will follow this same separation pattern.
 */
export function useDemoStatus(): DemoStatusState {
  const [state, setState] = useState<DemoStatusState>({
    label: "Base lista",
    message:
      "La aplicación ya tiene estructura para crecer con autenticación wallet, dashboard y consumo del backend."
  });

  /**
   * This effect keeps the demo ready for future client-only bootstrapping steps.
   * It receives no explicit parameters and runs once after mount.
   * It returns a cleanup function that does nothing for now.
   * It is important because future phases can expand this hook without changing the component contract.
   */
  useEffect(() => {
    setState((currentState) => currentState);

    return () => undefined;
  }, []);

  return state;
}
