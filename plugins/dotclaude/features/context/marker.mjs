// The markers of each session: one file for each level that fired, so that no level fires two times (design D32).
// The hook makes the file with the `wx` flag, so of two hooks that run at the same time, only one claims the level.
// The files are in the folder of the user (`lib/private-dir.mjs`) and not in the project.

import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync } from "node:fs";
import path from "node:path";
import { privateDir } from "../../lib/private-dir.mjs";

const hash = (text) =>
  createHash("sha256").update(text).digest("hex").slice(0, 16);

/** The marker file of level `id` in `session`: `dotclaude-level-<session hash>-<id hash>`. */
export const markerFile = (session, id, dir) =>
  path.join(dir, `dotclaude-level-${hash(session)}-${hash(id)}`);

/**
 * True when this call makes the marker of level `id` in `session`.
 * A level that fired, a missing folder, and any other error give false,
 * so that a level with no marker gives no note, and no note repeats at each call.
 */
export function claimLevel(session, id, dir = privateDir()) {
  if (!dir) return false;
  try {
    closeSync(openSync(markerFile(session, id, dir), "wx"));
    return true;
  } catch {
    return false;
  }
}

/** The id of the marker that a handoff note makes, so that `SessionEnd` knows that the session handed off. */
export const HANDOFF_MARK = "handoff";

/** True when a handoff note fired in `session`. */
export function handedOff(session, dir = privateDir()) {
  return Boolean(dir) && existsSync(markerFile(session, HANDOFF_MARK, dir));
}
