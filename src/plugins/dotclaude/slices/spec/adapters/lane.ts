// `dotclaude-spec lane <package> <lane> [--note <text>] [--json]`: moves a package and adds an event.
// Only the main session changes a lane, on the main checkout.
// The command appends one line to `events.jsonl`, with the note when the call gives one.
// A move to `blocked` and a move back need a note: a move back goes to `planned`, or from `review` to `doing`.
// A package goes to `canceled` only with `dotclaude-spec drop`, which needs a reason.
// It also sets the checkbox of the package line in `packages.md`: `[x]` for `done`, `[ ]` for each other lane.

import path from "node:path";
import { runProgram } from "../../../../../kernel/node/process.ts";
import { SPEC_ROOT } from "../../../../../kernel/paths.ts";
import {
  LANES,
  type Lane,
  type LaneEvent,
} from "../../../../../kernel/spec-store.ts";
import { parseArgs } from "./args.ts";
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

export const isLane = (value: string): value is Lane =>
  (LANES as readonly string[]).includes(value);

/**
 * The id of the one change whose `events.jsonl` has the package, or null with a message.
 * When more than one change has it, a change where the package is `done` drops out, because a done package does not move.
 */
export const changeOf = async (
  run: Run,
  pkg: string,
): Promise<string | null> => {
  const found: string[] = [];
  const open: string[] = [];
  for (const id of await run.store.changes()) {
    const events = await run.store.events(id);
    const lane = events ? (await run.store.lanes(id, events))[pkg] : undefined;
    if (lane === undefined) continue;
    found.push(id);
    if (lane !== "done") open.push(id);
  }
  if (found.length === 1) return found[0] ?? null;
  if (open.length === 1) return open[0] ?? null;
  run.io.error(
    found.length === 0
      ? `No change has the package \`${pkg}\`.`
      : `More than one change has the package \`${pkg}\`: ${found.join(", ")}.`,
  );
  return null;
};

/**
 * The lanes that a package in each lane may move to.
 * `done` and `canceled` have no move out: a package that is done or canceled stays there.
 */
const NEXT_LANES: Record<Lane, readonly Lane[]> = {
  planned: ["doing", "review", "done", "blocked", "canceled"],
  doing: ["review", "done", "blocked", "canceled"],
  review: ["doing", "done", "blocked", "canceled"],
  blocked: ["planned", "doing", "done", "canceled"],
  done: [],
  canceled: [],
};

/** True when a move from `before` to `lane` needs a note: a move to `blocked` or `canceled`, or a move back. */
export const needsNote = (before: Lane | undefined, lane: Lane): boolean =>
  lane === "blocked" ||
  lane === "canceled" ||
  (lane === "planned" && before !== undefined && before !== "planned") ||
  (before === "review" && lane === "doing");

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

/** The fields of an event after its package and lane: a note, or a verdict with its findings. */
export type EventExtra = Pick<LaneEvent, "note" | "verdict" | "findings">;

/** One move that a command made, with the fields of its event, for its `--json` output. */
export interface Move extends EventExtra {
  readonly change: string;
  readonly package: string;
  readonly from: Lane | undefined;
  readonly to: Lane;
}

/** Appends one event of the package to `events.jsonl` of the change `id`, and sets the checkbox in `packages.md`. */
export const appendMove = async (
  run: Run,
  id: string,
  event: Omit<LaneEvent, "at">,
): Promise<void> => {
  await run.store.appendEvent(id, {
    at: run.clock.now().toISOString(),
    ...event,
  });
  const list = path.posix.join(SPEC_ROOT, id, "packages.md");
  const text = await run.store.files.read(list);
  if (text !== null) {
    await run.store.write(
      list,
      setChecked(text, event.package, event.lane === "done"),
    );
  }
};

/**
 * Moves the package to `lane` with the fields of `extra`, and gives the move, or null after a message.
 * It checks the move with `check`, or against `NEXT_LANES` when the call gives no `check`.
 */
export const applyMove = async (
  run: Run,
  pkg: string,
  lane: Lane,
  extra: EventExtra = {},
  check?: (before: Lane | undefined) => string | null,
): Promise<Move | null> => {
  const id = await changeOf(run, pkg);
  if (id === null) return null;
  const events = await run.store.events(id);
  if (events === null) return null;
  const before = (await run.store.lanes(id, events))[pkg];
  const refused = check ? check(before) : refusedMove(pkg, before, lane);
  if (refused !== null) {
    run.io.error(refused);
    return null;
  }
  await appendMove(run, id, { package: pkg, lane, ...extra });
  return { change: id, package: pkg, from: before, to: lane, ...extra };
};

/** Prints one move as text, or as one line of JSON when `json` is true. */
export const printMove = (run: Run, move: Move, json: boolean): void =>
  run.io.log(
    json
      ? JSON.stringify(move)
      : `${move.change}: ${move.package} ${move.from} -> ${move.to}${move.verdict ? ` (${move.verdict})` : ""}`,
  );

/** Moves the package to `lane` and prints the move. Gives the exit status. */
export const moveLane = async (
  run: Run,
  pkg: string,
  lane: Lane,
  extra: EventExtra = {},
): Promise<number> => {
  const move = await applyMove(run, pkg, lane, extra);
  if (move === null) return 1;
  printMove(run, move, false);
  return 0;
};

/** True after a message when `run` is in a linked git worktree, where `doing` names what the command does. */
export const refusedInWorktree = (run: Run, doing: string): boolean => {
  if (!inLinkedWorktree(run.store.root)) return false;
  run.io.error(
    `This is a linked git worktree. Only the main checkout ${doing}.`,
  );
  return true;
};

const LANE_USAGE = `Usage: dotclaude-spec lane <package> <${LANES.join("|")}> [--note <text>] [--json]`;

export const laneCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const parsed = parseArgs(args, { values: ["note"] });
  if (typeof parsed === "string") {
    run.io.error(parsed);
    return 2;
  }
  const [pkg, lane, extra] = parsed.words;
  if (!pkg || !lane || extra !== undefined) {
    run.io.error(LANE_USAGE);
    return 2;
  }
  if (!isLane(lane)) {
    run.io.error(`The lane \`${lane}\` is not one of ${LANES.join(", ")}.`);
    return 2;
  }
  if (lane === "canceled") {
    run.io.error(
      "Use `dotclaude-spec drop <package> --reason <text>` to cancel a package.",
    );
    return 2;
  }
  if (refusedInWorktree(run, "changes a lane")) return 1;
  const note = parsed.values["note"];
  const move = await applyMove(
    run,
    pkg,
    lane,
    note === undefined ? {} : { note },
    (before) =>
      refusedMove(pkg, before, lane) ??
      (note === undefined && needsNote(before, lane)
        ? `The move of \`${pkg}\` from \`${before}\` to \`${lane}\` needs a reason. Run it again with \`--note <text>\`.`
        : null),
  );
  if (move === null) return 1;
  printMove(run, move, parsed.json);
  return 0;
};
