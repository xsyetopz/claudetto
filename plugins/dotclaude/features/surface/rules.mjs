// The rewrites of the prompt surface: pure functions, so the hooks module and the tests share them.
// Each one returns the new value, or `undefined` to pass the event on with no change.

/** @import { Settings, ToolDescribeResult } from "claude-code" */

import {
  AGENT_NOTE,
  AGENT_NOTE_FULL,
  AUTO_MODE_TEXT,
  DEFERRED_TOOLS,
  DROPPED_AGENTS,
  SANDBOX_RETRY_TEXT,
  SANDBOX_TEXT,
  TOOL_TEXT,
} from "./data.mjs";

// The commit list of the git status block, up to the next section or the end.
const RECENT_COMMITS = /\n+Recent commits:\n[\s\S]*?(?=\n# |\s*$)/;

/**
 * The value of `sandbox.allowUnsandboxedCommands` when the settings set it to a boolean, or `undefined`.
 *
 * @param {Settings | undefined} settings
 */
function escapeOf(settings) {
  const sandbox = settings?.sandbox;
  if (typeof sandbox !== "object" || sandbox === null) return undefined;
  const value = /** @type {{ allowUnsandboxedCommands?: unknown }} */ (sandbox)
    .allowUnsandboxedCommands;
  return typeof value === "boolean" ? value : undefined;
}

/** @typedef {(text: string, settings?: Settings) => string | undefined} Rewrite */

/**
 * The rewrite of each attachment type that this feature shortens, as `(text, settings) => new text or undefined`.
 * The sandbox text has two short forms: one with no escape (`allowUnsandboxedCommands` is `false`),
 * and one that keeps the rule for a run outside the sandbox after an approval (`true`).
 * With no value in the settings, the full text stays.
 */
const REWRITES = new Map(
  /** @type {[string, Rewrite][]} */ ([
    [
      "sandbox_instructions",
      (_text, settings) => {
        const allowed = escapeOf(settings);
        if (allowed === false) return SANDBOX_TEXT;
        return allowed === true ? SANDBOX_RETRY_TEXT : undefined;
      },
    ],
    ["auto_mode", () => AUTO_MODE_TEXT],
    ["session_context", (text) => text.replace(RECENT_COMMITS, "")],
    [
      "agent_listing_delta",
      (text) => text.replace(AGENT_NOTE_FULL, AGENT_NOTE),
    ],
  ]),
);

/** The `prompt.attachment` types that this feature rewrites. Any other type passes on unchanged. */
export const ATTACHMENT_TYPES = [...REWRITES.keys()];

/**
 * The shorter text of an attachment, or `undefined`.
 *
 * @param {string} type
 * @param {string} text
 * @param {Settings} [settings]
 */
export function attachmentText(type, text, settings) {
  const next = REWRITES.get(type)?.(text, settings);
  return next !== undefined && next.length < text.length ? next : undefined;
}

/**
 * Whether `agent.offer` leaves the agent type out.
 *
 * @param {string} agent
 */
export const isDropped = (agent) => DROPPED_AGENTS.includes(agent);

/**
 * The `tool.describe` answer for a tool, built on the `answer` of the engine, or `undefined`.
 * A deferral sets `isDeferred: true` and never `false`.
 * A shorter text replaces the description only when it is shorter.
 *
 * @param {string} tool
 * @param {ToolDescribeResult} answer
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
