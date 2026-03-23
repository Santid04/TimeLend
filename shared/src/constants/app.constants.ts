/**
 * This file stores cross-platform application constants for TimeLend.
 * It exists to keep shared names and limits out of individual applications.
 * It fits the system by giving all modules a single source for non-secret shared values.
 */
/**
 * This constant defines the canonical product name shared across modules.
 * It receives no runtime input and is loaded statically.
 * It returns the human-readable application name.
 * It is important because frontend, backend and docs should refer to the same product identity.
 */
export const TIME_LEND_APP_NAME = "TimeLend";

/**
 * This constant defines the maximum number of appeal attempts planned by the product.
 * It receives no runtime input and is loaded statically.
 * It returns the allowed count as a number.
 * It is important because the domain is expected to support one and only one appeal.
 */
export const MAX_APPEAL_COUNT = 1;
