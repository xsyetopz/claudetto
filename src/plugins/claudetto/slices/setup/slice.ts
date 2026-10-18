// The manifest of the `setup` slice: the skill `/setup` and the CLI `claudetto-setup`, which merge the settings snippet into a settings file.
// A plugin cannot set most settings, so the snippet is the way to turn off the parts of Claude Code that claudetto removes.
// The `settings` below are the entries of `setup`. The other slices add their own entries to the snippet.

import type { Slice } from "../../../../kernel/slice.ts";

export const slice = {
  name: "setup",
  ladder: "built-in: settings and env vars, because a plugin cannot set them",
  cli: { bin: "claudetto-setup" },
  skills: ["setup"],
  settings: {
    env: {
      // Each part that claudetto removes has a switch: cron tools, fast mode text, and the short prompt for each model.
      CLAUDE_CODE_DISABLE_CRON: "1",
      CLAUDE_CODE_DISABLE_FAST_MODE: "1",
      CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT: "1",
    },
    includeGitInstructions: false,
    autoMemoryEnabled: false,
    disableClaudeAiConnectors: true,
    syncClaudeAiSkills: false,
    syncClaudeAiPlugins: false,
    // Tests and dev servers bind a local port without leaving the sandbox.
    sandbox: { network: { allowLocalBinding: true } },
  },
} satisfies Slice;
