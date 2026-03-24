/**
 * This file defines the main hero component used on the frontend landing page.
 * It exists to isolate the demo presentation from the route entry file.
 * It fits the system by giving the future UI a reusable top-level marketing shell.
 */
type DemoHeroProps = {
  description: string;
  roadmapLabel: string;
  title: string;
};

/**
 * This component renders the landing hero of the demo frontend.
 * It receives the main copy and the currently configured backend URL.
 * It returns the introductory section shown on the home page.
 * It is important because it communicates what exists today and what comes next.
 */
export function DemoHero({
  description,
  roadmapLabel,
  title
}: DemoHeroProps) {
  return (
    <section className="hero-card">
      <p className="hero-badge">TimeLend</p>
      <h1>{title}</h1>
      <p>{description}</p>

      <div className="hero-metadata">
        <div className="metadata-item">
          <span>Estado actual</span>
          <strong>Demo frontend scaffold</strong>
        </div>
        <div className="metadata-item">
          <span>Siguiente hito</span>
          <strong>{roadmapLabel}</strong>
        </div>
      </div>
    </section>
  );
}
