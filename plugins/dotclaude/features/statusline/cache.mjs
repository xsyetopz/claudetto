// A short cache for slow reads.
// The status line runs every `REFRESH_SECONDS`, so a slow result goes through `cached`.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { privateDir } from "../../lib/private-dir.mjs";
import { STATUS_CACHE_MS } from "./limits.mjs";

/** `compute()`, run at most once for each `STATUS_CACHE_MS` and key. `now` is in milliseconds. */
export function cached(key, compute, now = Date.now(), dir = privateDir()) {
  if (!dir) return compute();
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 16);
  const file = path.join(dir, `dotclaude-status-${hash}.json`);
  try {
    const prev = JSON.parse(fs.readFileSync(file, "utf8"));
    if (now - prev.at >= 0 && now - prev.at < STATUS_CACHE_MS)
      return prev.value;
  } catch {
    // No copy yet, or another run is writing it.
  }
  const value = compute();
  try {
    fs.writeFileSync(file, JSON.stringify({ at: now, value }));
  } catch {
    // The value is right. Only the next run computes it again.
  }
  return value;
}
