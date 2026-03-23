/**
 * This file defines the demo landing page for the TimeLend frontend scaffold.
 * It exists to prove the workspace runs correctly before the final product UI is built.
 * It fits the system by exposing a stable entry screen that can later be replaced without changing app foundations.
 */
import { DemoHero } from "@/components/demo-hero";
import { DemoStatusCard } from "@/components/demo-status-card";
import { getFrontendRuntimeConfig } from "@/lib/env";
import { demoFeatures, siteConfig } from "@/lib/site-config";

/**
 * This component renders the minimal landing page for local development.
 * It receives no props because the page content is derived from local configuration.
 * It returns the scaffolded homepage UI.
 * It is important because it validates the frontend package, routing and styling stack end to end.
 */
export default function HomePage() {
  const runtimeConfig = getFrontendRuntimeConfig();

  return (
    <main className="page-shell">
      <DemoHero
        apiBaseUrl={runtimeConfig.NEXT_PUBLIC_API_BASE_URL}
        description={siteConfig.description}
        roadmapLabel={siteConfig.roadmapLabel}
        title={siteConfig.name}
      />

      <section className="card-grid" aria-label="Próximos módulos">
        {demoFeatures.map((feature) => (
          <article className="info-card" key={feature.title}>
            <p className="eyebrow">{feature.phase}</p>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <DemoStatusCard />
    </main>
  );
}
