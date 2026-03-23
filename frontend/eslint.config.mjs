/**
 * This file re-exports the repository ESLint configuration from the frontend workspace.
 * It exists so Next.js can detect a local ESLint config while the monorepo keeps one shared ruleset.
 * It fits the system by preserving a single lint policy without sacrificing framework integration signals.
 */
import rootConfig from "../eslint.config.mjs";

export default rootConfig;
