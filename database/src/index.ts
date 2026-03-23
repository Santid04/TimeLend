/**
 * This file re-exports the public database workspace surface.
 * It exists to keep imports from this package centralized and stable.
 * It fits the system by giving other workspaces one clean persistence entry point.
 */
export { prisma } from "./client";
