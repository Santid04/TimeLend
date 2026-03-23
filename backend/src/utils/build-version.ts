/**
 * This file exposes the backend package version in a stable helper.
 * It exists so controllers and services do not reach into package metadata directly.
 * It fits the system by centralizing one of the simplest but most reused system metadata values.
 */
import packageJson from "../../package.json";

/**
 * This function returns the current backend package version.
 * It receives no arguments because the version is read from local package metadata.
 * It returns the semantic version string of the backend workspace.
 * It is important because health, diagnostics and deploy verification depend on it.
 */
export function getBuildVersion(): string {
  return packageJson.version;
}
