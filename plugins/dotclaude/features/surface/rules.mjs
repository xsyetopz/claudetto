// The rewrites of the prompt surface: pure functions, so the hooks module and the tests share them.
// Each one returns the new value, or `undefined` to pass the event on with no change.

import {
  AGENT_NOTE,
  AGENT_NOTE_FULL,
  AUTO_MODE_TEXT,
  DEFERRED_TOOLS,
  DROPPED_AGENTS,
  SANDBOX_TEXT,
  TOOL_TEXT,
} from "./data.mjs";

/** The `prompt.attachment` types that this feature rewrites. Any other type passes on unchanged. */
export const ATTACHMENT_TYPES = [
  "sandbox_instructions",
  "auto_mode",
  "session_context",
  "agent_listing_delta",
];

// The commit list of the git status block, up to the next section or the end.
const RECENT_COMMITS = /\n+Recent commits:\n[\s\S]*?(?=\n# |\s*$)/;

/**
 * The shorter text of an attachment, or `undefined`.
 * The sandbox text is shorter only when the settings turn off the escape (`allowUnsandboxedCommands` is `false`),
 * because the full text states how the model asks for an unsandboxed run.
 */
export function attachmentText(type, text, settings) {
  let next;
  if (type === "sandbox_instructions")
    next =
      settings?.sandbox?.allowUnsandboxedCommands === false
        ? SANDBOX_TEXT
        : undefined;
  else if (type === "auto_mode") next = AUTO_MODE_TEXT;
  else if (type === "session_context") next = text.replace(RECENT_COMMITS, "");
  else if (type === "agent_listing_delta")
    next = text.replace(AGENT_NOTE_FULL, AGENT_NOTE);
  return next !== undefined && next.length < text.length ? next : undefined;
}

/** Whether `agent.offer` leaves the agent type out. */
export const isDropped = (agent) => DROPPED_AGENTS.includes(agent);

/**
 * The `tool.describe` answer for a tool, built on the `answer` of the engine, or `undefined`.
 * A deferral sets `isDeferred: true` and never `false`.
 * A shorter text replaces the description only when it is shorter.
 */
export function toolAnswer(tool, answer) {
  const text = TOOL_TEXT[tool];
  const shorter = text && text.length < answer.description.length;
  const defer = DEFERRED_TOOLS.includes(tool);
  if (!(shorter || defer)) return undefined;
  return {
    ...answer,
    ...(shorter && { description: text }),
    ...(defer && { isDeferred: true }),
  };
}
