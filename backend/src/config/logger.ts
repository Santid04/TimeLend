/**
 * This file exposes a tiny logger abstraction for the backend scaffold.
 * It exists so the application does not scatter raw console usage across modules.
 * It fits the system by providing one place to evolve toward structured logging later.
 */
type LogContext = Record<string, unknown>;

/**
 * This function prints informational logs in a consistent shape.
 * It receives a message and an optional context payload.
 * It returns nothing because its job is side-effect logging.
 * It is important because future observability can replace this implementation without changing callers.
 */
function info(message: string, context?: LogContext) {
  console.info("[timelend:info]", message, context ?? {});
}

/**
 * This function prints warning logs in a consistent shape.
 * It receives a message and an optional context payload.
 * It returns nothing because its job is side-effect logging.
 * It is important because not every anomalous state should fail the request lifecycle.
 */
function warn(message: string, context?: LogContext) {
  console.warn("[timelend:warn]", message, context ?? {});
}

/**
 * This function prints error logs in a consistent shape.
 * It receives a message and an optional context payload.
 * It returns nothing because its job is side-effect logging.
 * It is important because failures related to AI, blockchain or uploads will need consistent diagnostics.
 */
function error(message: string, context?: LogContext) {
  console.error("[timelend:error]", message, context ?? {});
}

/**
 * This object exposes the logger methods used by the application.
 * It receives no direct runtime input.
 * It returns a grouped logger API.
 * It is important because callers depend on a small stable surface instead of raw globals.
 */
export const logger = {
  error,
  info,
  warn
};
