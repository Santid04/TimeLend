/**
 * This file exposes the shared Prisma client instance for the database workspace.
 * It exists to avoid creating multiple PrismaClient instances during development.
 * It fits the system by giving the backend a safe, reusable persistence entry point.
 */
import { PrismaClient } from "@prisma/client";

declare global {
  // This global declaration caches the Prisma client during local development reloads.
  // It exists to avoid exhausting connections when modules are reloaded repeatedly.
  // It fits the system by making development ergonomics safer without affecting production behavior.
  var timelendPrisma: PrismaClient | undefined;
}

/**
 * This constant creates or reuses the Prisma client instance.
 * It receives no direct parameters because configuration comes from Prisma itself and environment variables.
 * It returns a PrismaClient ready for database operations.
 * It is important because every server-side module should share one predictable client contract.
 */
export const prisma =
  global.timelendPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.timelendPrisma = prisma;
}
