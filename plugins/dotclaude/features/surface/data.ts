// The texts and names of the prompt surface handlers (design D3).
// Each text is shorter than the Claude Code text that it replaces (sizes: `research/capture.md`, `research/probes-2.md`).
// A handler never returns a text that is longer than the text it got.
// The texts come from `src/plugins/dotclaude/features/surface/texts.ts/` through `just generate`.

import {
  AGENT_NOTE,
  AGENT_NOTE_FULL,
  AUTO_MODE,
  SANDBOX,
  SANDBOX_RETRY,
  TOOL_AGENT,
  TOOL_BASH,
  TOOL_READ,
} from "./texts.ts";

/** The text of the `sandbox_instructions` attachment, when the sandbox has no escape. */
export const SANDBOX_TEXT = SANDBOX;

/** The text of the `sandbox_instructions` attachment, when the user can approve a run outside the sandbox. */
export const SANDBOX_RETRY_TEXT = SANDBOX_RETRY;

/** The text of the `auto_mode` attachment. */
export const AUTO_MODE_TEXT = AUTO_MODE;

/** The line that the `agent_listing_delta` text ends with when two agents can run together, and its shorter form. */
export { AGENT_NOTE, AGENT_NOTE_FULL };

/** The built-in agents that dotclaude does not use. `agent.offer` leaves them out of the listing and out of dispatch. */
export const DROPPED_AGENTS = ["claude-code-guide", "statusline-setup"];

/**
 * The tools that the engine defers with a token saving (task 2.19, `research/probes-2.md`).
 * The saving is 1,682 tokens for `AskUserQuestion` (interactive capture) and 405 for `ListAgents`, and the capture was not repeated on 2.1.296.
 * In 2.1.296, the `AskUserQuestion` text has no plan mode note when `EnterPlanMode` or `ExitPlanMode` is absent from the tool list, so the saving can be smaller.
 * `tool.describe` sets `isDeferred: true` for them and never sets it to `false`.
 */
export const DEFERRED_TOOLS = ["AskUserQuestion", "ListAgents"];

/**
 * The shorter descriptions of the large tools that stay loaded.
 * The schemas stay as the engine sends them.
 */
export const TOOL_TEXT: Record<string, string> = {
  Agent: TOOL_AGENT,
  Bash: TOOL_BASH,
  Read: TOOL_READ,
};
