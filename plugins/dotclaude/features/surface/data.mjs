// The texts and names of the prompt surface handlers (design D3).
// Each text is shorter than the Claude Code text that it replaces (sizes: `research/capture.md`, `research/probes-2.md`).
// A handler never returns a text that is longer than the text it got.

/** The text of the `sandbox_instructions` attachment, when the sandbox has no escape. */
export const SANDBOX_TEXT = [
  "Each command runs in the sandbox.",
  "The sandbox limits the files that a command can write and the hosts that it can reach.",
  "When a command fails with a sandbox error, do not run it again.",
  "Tell the user which path or host the command needs.",
  "The user changes the sandbox settings.",
  "A call with `dangerouslyDisableSandbox` also runs in the sandbox.",
].join("\n");

/** The text of the `auto_mode` attachment. */
export const AUTO_MODE_TEXT = [
  "Auto mode is on.",
  "Run routine steps without asking.",
  "Ask the user before an action that is hard to undo or that other people see.",
  "Do not get around a permission rule, a hook, or the sandbox.",
].join("\n");

/** The line that the `agent_listing_delta` text ends with when two agents can run together, and its shorter form. */
export const AGENT_NOTE_FULL =
  "When you launch multiple agents for independent work, send them in a single message with multiple tool uses so they run concurrently.";
export const AGENT_NOTE =
  "Send agents for independent work in one message, so that they run in parallel.";

/** The built-in agents that the profile does not use. `agent.offer` leaves them out of the listing and out of dispatch. */
export const DROPPED_AGENTS = ["claude-code-guide", "statusline-setup"];

/**
 * The tools that the engine defers with a token saving (task 2.19, `research/probes-2.md`).
 * The saving is 1,682 tokens for `AskUserQuestion` (interactive capture) and 405 for `ListAgents`, measured on 2.1.294.
 * In 2.1.295, the `AskUserQuestion` text has no plan mode note when the plan tools are absent, so the saving can be smaller.
 * `tool.describe` sets `isDeferred: true` for them and never sets it to `false`.
 */
export const DEFERRED_TOOLS = ["AskUserQuestion", "ListAgents"];

/** The shorter descriptions of the large tools that stay loaded. The schemas stay as the engine sends them. */
export const TOOL_TEXT = {
  Agent: `Starts an agent for a multi-step task.
The agent types are in the \`<system-reminder>\` messages.
Set \`subagent_type\`, or the general-purpose agent runs.

Use it when the task matches an agent type, when work can run in parallel, or when the answer needs reads across several files.
You keep the conclusion and not the file dumps.
For one fact in a known file, search directly.
After you delegate a search, wait for the result and do not run it yourself.

- The final report is not shown to the user. Relay what matters.
- \`SendMessage\` with the agent ID or name continues an agent with its context. A new Agent call starts fresh.
- The model, effort, and tools of an agent come from its definition.
- \`isolation: "worktree"\` gives the agent its own git worktree.
- Agents run in the background, and you get a notification at the end. Set \`run_in_background: false\` only when your next action needs the result. Never write or predict the result of a pending agent. If the user asks first, say that it still runs.`,
  Bash: `Runs a bash command and returns its output.

- The working directory persists between calls. Use absolute paths, because \`cd\` in a compound command can cause a permission prompt. Shell state does not persist.
- The output goes to you and not reliably to the user.
- \`timeout\` is in milliseconds: default 120000, maximum 600000.
- \`run_in_background\` runs the command detached and wakes you when it ends. Do not add \`&\`. A foreground \`sleep\` is blocked: use Monitor with an until-loop.

# Git
- Interactive flags (\`-i\`) are not supported.
- Use \`gh\` for GitHub.
- Commit or push only when the user asks. If on the default branch, branch first.
- End commit messages and PR bodies with the attribution lines of the system-reminder, when it has them.`,
  Read: `Reads a file from the local filesystem.

- \`file_path\` must be an absolute path.
- It reads up to 2000 lines. Read only the part that you need, with \`offset\` and \`limit\`.
- The result has \`cat -n\` line numbers from 1.
- It reads images, PDFs (\`pages\` is required over 10 pages, maximum 20 per request), and Jupyter notebooks.
- A directory, a missing file, or an empty file gives an error or a system reminder.
- Do not read a file again after an edit to verify it. Edit and Write report an error when they fail.`,
};
