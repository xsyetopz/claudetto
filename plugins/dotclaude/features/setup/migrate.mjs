// The change of a 0.27.0 settings file to the 0.28.0 profile, beyond what `mergeProfile` does.
// `mergeProfile` already replaces `availableModels` and `maxEffortLevel`.
// This file holds the parts that a merge does not do.

import { REFRESH_SECONDS } from "./limits.mjs";
import { isObject } from "./rules.mjs";

/** The `env` entry that the 0.27.0 profile wrote and that points at a model that left the roster. */
export const OLD_HAIKU = ["ANTHROPIC_DEFAULT_HAIKU_MODEL", "claude-haiku-4-5"];

/** The value of `cleanupPeriodDays` that the 0.27.0 profile wrote. */
export const OLD_CLEANUP_DAYS = 14;

/**
 * The `statusLine` entry for a launcher stub at `stub`.
 * `hideVimModeIndicator` is true, because the dotclaude status line renders `vim.mode` itself.
 */
export const statusLineEntry = (stub) => ({
  type: "command",
  command: `node ${JSON.stringify(stub)}`,
  padding: 0,
  refreshInterval: REFRESH_SECONDS,
  hideVimModeIndicator: true,
});

/** The `subagentStatusLine` entry for a launcher stub at `stub`. Claude Code allows no other key. */
export const subagentEntry = (stub) => ({
  type: "command",
  command: `node ${JSON.stringify(stub)}`,
});

/**
 * `settings` after the 0.27.0 changes, and one line for each change.
 * It removes the haiku entry of `env` when it holds the 0.27.0 value.
 * It replaces a status line entry and a subagent status line entry that run a dotclaude stub (`ours`)
 * with `statusLine` and `subagentStatusLine` as a whole, so a field of an older entry does not stay.
 * A `null` entry means that the entry of the user stays.
 * `removeCleanup` removes `cleanupPeriodDays` when it holds the 0.27.0 value 14, and any other value stays.
 */
export function migrate027(
  settings,
  { statusLine, subagentStatusLine, ours, removeCleanup },
  changes,
) {
  const out = { ...settings };
  const [key, value] = OLD_HAIKU;
  if (isObject(out.env) && out.env[key] === value) {
    const { [key]: _gone, ...env } = out.env;
    changes.push(`env.${key}: "${value}" -> (unset)`);
    if (Object.keys(env).length) out.env = env;
    else delete out.env;
  }
  if (
    statusLine &&
    ours(out.statusLine) &&
    JSON.stringify(out.statusLine) !== JSON.stringify(statusLine)
  ) {
    changes.push(
      `statusLine: ${JSON.stringify(out.statusLine)} -> ${JSON.stringify(statusLine)}`,
    );
    out.statusLine = statusLine;
  }
  if (
    subagentStatusLine &&
    ours(out.subagentStatusLine) &&
    JSON.stringify(out.subagentStatusLine) !==
      JSON.stringify(subagentStatusLine)
  ) {
    changes.push(
      `subagentStatusLine: ${JSON.stringify(out.subagentStatusLine)} -> ${JSON.stringify(subagentStatusLine)}`,
    );
    out.subagentStatusLine = subagentStatusLine;
  }
  if (removeCleanup && out.cleanupPeriodDays === OLD_CLEANUP_DAYS) {
    changes.push(`cleanupPeriodDays: ${OLD_CLEANUP_DAYS} -> (unset)`);
    delete out.cleanupPeriodDays;
  }
  return out;
}
