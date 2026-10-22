export const DOCS_SNIPPET = {
  permissions: {
    allow: [
      "Skill(claudetto-docs:find-docs)",
      "Bash(CTX7_TELEMETRY_DISABLED=1 bunx -y ctx7@0.6.1 library *)",
      "Bash(CTX7_TELEMETRY_DISABLED=1 bunx -y ctx7@0.6.1 docs *)",
    ],
  },
};

// `setup` writes this snippet, so its source is in the `setup` slice.
export { SNIPPET } from "./slices/setup/prompts.ts";
