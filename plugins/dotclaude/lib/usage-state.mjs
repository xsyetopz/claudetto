// The usage state file of design D32: the 5-hour and 7-day windows of the account.
// No hook input has `rate_limits`, and only the status line input has them,
// so the status line writes the windows here, and the context hook reads them.
// One JSON file in the folder of the user (`private-dir.mjs`) holds them for each account.

import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { privateDir } from "./private-dir.mjs";

/** The span in seconds of each usage window that the file keeps. */
export const WINDOW_SPANS = { five_hour: 5 * 3600, seven_day: 7 * 86_400 };

/** The account of the session: the config folder of Claude Code. */
export const accountOf = (env = process.env) =>
  env.CLAUDE_CONFIG_DIR || os.homedir();

const hash = (text) =>
  createHash("sha256").update(text).digest("hex").slice(0, 12);

/** The file of `account` in `dir`: `dotclaude-usage-<account hash>.json`. */
export const usageFile = (account, dir) =>
  path.join(dir, `dotclaude-usage-${hash(account)}.json`);

/**
 * Write the windows of `account` at `now` (seconds).
 * `windows` maps a key of `WINDOW_SPANS` to `{used_percentage, resets_at, run_out_at}`,
 * where `run_out_at` is `null` when the window lasts to its reset.
 */
export function writeUsage(account, windows, now, dir = privateDir()) {
  if (!dir) return;
  try {
    fs.writeFileSync(
      usageFile(account, dir),
      JSON.stringify({ t: now, ...windows }),
    );
  } catch {
    // The hook gives no usage note until the next run of the status line writes the file.
  }
}

/**
 * The windows of `account` that are current at `now` (seconds), or `undefined` when none is.
 * A window is current when its reset is after `now` and the file was written inside the window.
 * A missing or broken file gives `undefined`, such as in `-p` mode, where no status line runs.
 */
export function readUsage(account, now, dir = privateDir()) {
  if (!dir) return undefined;
  let state;
  try {
    state = JSON.parse(fs.readFileSync(usageFile(account, dir), "utf8"));
  } catch {
    return undefined;
  }
  const out = {};
  for (const [key, span] of Object.entries(WINDOW_SPANS)) {
    const w = state?.[key];
    if (
      Number.isFinite(w?.used_percentage) &&
      w.resets_at > now &&
      state.t >= w.resets_at - span
    )
      out[key] = w;
  }
  return Object.keys(out).length ? out : undefined;
}
