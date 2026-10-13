// `dotclaude-spec runs`: prints the number of agent runs that a wave of `/ship` may start now.
// When the count is 0, a second line gives the time when the runs become more than 0.

import path from "node:path";
import { isExpected } from "../../../../../kernel/errors.ts";
import { RATE_LIMITS_FILE } from "../../../../../kernel/paths.ts";
import {
  capOf,
  parseSample,
  resetOf,
  runsAllowed,
  STALE_SAMPLE,
  type UsageSample,
} from "../domain/runs.ts";
import { gitPath } from "./git.ts";
import type { Run } from "./run.ts";

/** The project root of `cwd`: the top of its git repository, or `cwd` when git gives none. The status line keeps the sample there. */
const projectRoot = (cwd: string): string =>
  gitPath(cwd, "--show-toplevel") ?? cwd;

/** The usage sample of the project, or null when the status line has kept none. A corrupt or unreadable file gives a stale sample. */
const sampleOf = async (root: string): Promise<UsageSample | null> => {
  try {
    return parseSample(
      await Bun.file(path.join(root, RATE_LIMITS_FILE)).text(),
    );
  } catch (err) {
    return isExpected(err, "ENOENT") ? null : STALE_SAMPLE;
  }
};

/** Prints the runs of one wave, from the cap of `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` and the usage sample. */
export const runsCommand = async (run: Run): Promise<number> => {
  const cap = capOf(process.env["CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS"]);
  const now = run.clock.now().getTime();
  const sample = await sampleOf(projectRoot(run.store.root));
  const allowed = runsAllowed(cap, sample, now);
  run.io.log(String(allowed));
  if (allowed === 0) {
    const reset = resetOf(cap, sample, now);
    if (reset !== null) run.io.log(new Date(reset * 1000).toISOString());
  }
  return 0;
};
