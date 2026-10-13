// `dotclaude-spec lane <package> <lane>`: moves a package and adds an event.
// Only the main session changes a lane, on the main checkout.
// The command appends one line to `events.jsonl`.
// It also sets the checkbox of the package line in `packages.md`: `[x]` for `done`, `[ ]` for each other lane.

import path from "node:path";
import { runProgram } from "../../../../../kernel/node/process.ts";
import { SPEC_ROOT } from "../../../../../kernel/paths.ts";
import { LANES, type Lane } from "../../../../../kernel/spec-store.ts";
import { setChecked } from "./plan-files.ts";
import type { Run } from "./run.ts";

/** The path that `git rev-parse flag` gives in `cwd`, as an absolute path, or null when git gives none. */
export const gitPath = (cwd: string, flag: string): string | null => {
  try {
    const result = runProgram("git", ["rev-parse", flag], {
      cwd,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
      timeout: 10_000,
    });
    const out = result.stdout?.toString().trim() ?? "";
    return result.exitCode === 0 && out ? path.resolve(cwd, out) : null;
  } catch {
    return null;
  }
};

/** True when `cwd` is in a linked git worktree: its git folder is not the common git folder. */
export const inLinkedWorktree = (cwd: string): boolean => {
  const dir = gitPath(cwd, "--git-dir");
  const common = gitPath(cwd, "--git-common-dir");
  return dir !== null && common !== null && dir !== common;
};

const isLane = (value: string): value is Lane =>
  (LANES as readonly string[]).includes(value);

/** The id of the one change whose `events.jsonl` has the package, or null with a message. */
export const changeOf = async (
  run: Run,
  pkg: string,
): Promise<string | null> => {
  const found: string[] = [];
  for (const id of await run.store.changes()) {
    const events = await run.store.events(id);
    if (events && pkg in (await run.store.lanes(id, events))) found.push(id);
  }
  if (found.length === 1) return found[0] ?? null;
  run.io.error(
    found.length === 0
      ? `No change has the package \`${pkg}\`.`
      : `More than one change has the package \`${pkg}\`: ${found.join(", ")}.`,
  );
  return null;
};

/**
 * The lanes that a package in each lane may move to.
 * `done` has no move out: a package that is done stays done.
 */
const NEXT_LANES: Record<Lane, readonly Lane[]> = {
  planned: ["doing", "done", "blocked"],
  doing: ["review", "done", "blocked"],
  review: ["doing", "done", "blocked"],
  blocked: ["planned", "doing", "done"],
  done: [],
};

/** The message of a move that `NEXT_LANES` does not allow, or null when the move is allowed. */
export const refusedMove = (
  pkg: string,
  before: Lane | undefined,
  lane: Lane,
): string | null => {
  if (before === undefined) return null;
  if (NEXT_LANES[before].includes(lane)) return null;
  return before === lane
    ? `The package \`${pkg}\` is already in \`${lane}\`.`
    : `The package \`${pkg}\` is in \`${before}\`, and it cannot move to \`${lane}\`.`;
};

/** Appends the event of the move to `events.jsonl`, and sets the checkbox in `packages.md`. Gives the exit status. */
export const moveLane = async (
  run: Run,
  pkg: string,
  lane: Lane,
): Promise<number> => {
  const id = await changeOf(run, pkg);
  if (id === null) return 1;
  const events = await run.store.events(id);
  if (events === null) return 1;
  const before = (await run.store.lanes(id, events))[pkg];
  const refused = refusedMove(pkg, before, lane);
  if (refused !== null) {
    run.io.error(refused);
    return 1;
  }
  await run.store.appendEvent(id, {
    at: run.clock.now().toISOString(),
    package: pkg,
    lane,
  });
  const list = path.posix.join(SPEC_ROOT, id, "packages.md");
  const text = await run.store.files.read(list);
  if (text !== null) {
    await run.store.write(list, setChecked(text, pkg, lane === "done"));
  }
  run.io.log(`${id}: ${pkg} ${before} -> ${lane}`);
  return 0;
};

export const laneCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const [pkg, lane] = args;
  if (!pkg || !lane) {
    run.io.error(`Usage: dotclaude-spec lane <package> <${LANES.join("|")}>`);
    return 2;
  }
  if (!isLane(lane)) {
    run.io.error(`The lane \`${lane}\` is not one of ${LANES.join(", ")}.`);
    return 2;
  }
  if (inLinkedWorktree(run.store.root)) {
    run.io.error(
      "This is a linked git worktree. Only the main checkout changes a lane.",
    );
    return 1;
  }
  return moveLane(run, pkg, lane);
};
