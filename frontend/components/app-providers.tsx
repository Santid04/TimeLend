/**
 * This file mounts the client-side providers required by the demo frontend.
 * It exists to keep wallet and query infrastructure out of the root layout itself.
 * It fits the system by giving every client component access to wagmi and react-query from one place.
 */
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { WagmiProvider } from "wagmi";

import { LanguageProvider } from "@/lib/i18n/provider";
import type { Language } from "@/lib/i18n/translations";
import { wagmiConfig } from "@/lib/wagmi";

type AppProvidersProps = {
  children: ReactNode;
  initialLanguage: Language;
};

/**
 * This component wraps the app with the shared client providers.
 * It receives the rendered page tree.
 * It returns the provider-wrapped React subtree.
 * It is important because wallet state and async query state must survive normal client rerenders.
 */
export function AppProviders({ children, initialLanguage }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider initialLanguage={initialLanguage}>{children}</LanguageProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
