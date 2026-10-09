// The burn-rate samples of the 5-hour limit.
// One JSON file in the folder of the user (`lib/private-dir.mjs`) holds them for each account.
// It starts again when `resets_at` changes, and when the used percentage drops inside a window.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { privateDir } from "../../lib/private-dir.mjs";
import { SAMPLE_INTERVAL_S, SAMPLES_MAX } from "./limits.mjs";

/**
 * The state after one sample of `pct` at `now` (seconds) in the window that ends at `resetsAt`.
 * `state` is the earlier state or `undefined`.
 * `resetUsed` is true when the percentage dropped inside the window, which is a limit reset that the user used.
 */
export function step(state, resetsAt, pct, now) {
  const fresh = (resetUsed) => ({
    resets_at: resetsAt,
    samples: [{ t: now, pct }],
    resetUsed,
  });
  if (state?.resets_at !== resetsAt || !Array.isArray(state.samples))
    return fresh(false);
  const last = state.samples.at(-1);
  if (!last) return fresh(false);
  if (pct < last.pct) return fresh(true);
  if (pct === last.pct && now - last.t < SAMPLE_INTERVAL_S) return state;
  return {
    ...state,
    samples: [...state.samples, { t: now, pct }].slice(-SAMPLES_MAX),
  };
}

const hash = (text) =>
  createHash("sha256").update(text).digest("hex").slice(0, 12);

/** The file of an account and a window in `dir`: `dotclaude-burn-<account hash>-<resets_at hash>.json`. */
const fileOf = (account, resetsAt, dir) =>
  path.join(dir, `${prefixOf(account)}${hash(String(resetsAt))}.json`);
const prefixOf = (account) => `dotclaude-burn-${hash(account)}-`;

/**
 * Add one sample to the file of `account` and return the new state, or `null` when the data is not usable.
 * `now` is in seconds.
 * The first sample of a new window removes the files of the old windows of the same account.
 */
export function recordBurn(account, window, now, dir = privateDir()) {
  const pct = window?.used_percentage;
  if (!(Number.isFinite(pct) && Number.isFinite(window?.resets_at)))
    return null;
  if (!dir) return step(undefined, window.resets_at, pct, now);
  const file = fileOf(account, window.resets_at, dir);
  let state;
  try {
    state = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    // No file yet, or another run is writing it.
  }
  const next = step(state, window.resets_at, pct, now);
  if (!state) removeOldWindows(account, file, dir);
  if (next !== state)
    try {
      fs.writeFileSync(file, JSON.stringify(next));
    } catch {
      // The state is right. Only the next run adds its sample again.
    }
  return next;
}

/** Remove the burn files of `account` in `dir`, except `keep`. */
function removeOldWindows(account, keep, dir) {
  try {
    for (const name of fs.readdirSync(dir))
      if (name.startsWith(prefixOf(account)) && path.join(dir, name) !== keep)
        fs.rmSync(path.join(dir, name), { force: true });
  } catch {
    // The old files stay. They hold no secret and the temporary folder is cleaned.
  }
}
