/**
 * This file defines the repository-wide Prettier rules.
 * It exists so formatting stays deterministic across every workspace.
 * It fits the system by making audits, reviews and future automated changes easier to read.
 */
const prettierConfig = {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
  tabWidth: 2
};

export default prettierConfig;
