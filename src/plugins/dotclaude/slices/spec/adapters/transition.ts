// The state changes of the phase commands: one event in `events.jsonl` and the `status` key of the file.
// The log is the record, and the `status` key is a copy, so each move appends the event first and then writes the copy.
// Only the main checkout changes a state.

import path from "node:path";
import { isClosed, type StateEvent } from "../../../../../kernel/spec-store.ts";
import { withStatus } from "../domain/front.ts";
import {
  type ChangeState,
  isChangeState,
  isPackageState,
  type PackageState,
} from "../domain/states.ts";
import { CHANGE_INITIAL, lastState } from "../domain/status.ts";
import { changeDir, type PackageFile, readPackages } from "./files.ts";
import { inLinkedWorktree } from "./git.ts";
import type { Run } from "./run.ts";

/** The fields of an event after its time, its package, and its state: the evidence of the move. */
export type Evidence = Omit<StateEvent, "at" | "package" | "state">;

/** One move that a command made, for its `--json` output and its text line. */
export interface Moved extends Evidence {
  readonly change: string;
  readonly package?: string;
  readonly from: string;
  readonly to: string;
}

/** The decision of an event: after a failed `verify` or a `reject`, the next `implement` fixes the code or revises the spec. */
export type Decision = NonNullable<StateEvent["decision"]>;

/** True when `value` is a `Decision`. */
export const isDecision = (value: string | undefined): value is Decision =>
  value === "fix-code" || value === "revise-spec";

/** `fields` with each key that is undefined removed, so an event has no key with no value. */
export const evidence = (
  fields: { [K in keyof Evidence]?: Evidence[K] | undefined },
): Evidence =>
  Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  ) as Evidence;

/** Writes `usage` as an error and gives the exit status `2`, for a call with wrong arguments. */
export const usage = (run: Run, message: string): number => {
  run.io.error(message);
  return 2;
};

/** Prints `moved` as text, or as one line of JSON with the `command` first when `json` is true. */
export const printMoved = (
  run: Run,
  command: string,
  moved: Moved,
  json: boolean,
): void =>
  run.io.log(
    json
      ? JSON.stringify({ command, ...moved })
      : `${moved.change}: ${moved.package ?? "change"} ${moved.from} -> ${moved.to}`,
  );

/** Writes `reason` as an error and gives the exit status `1`, for a command that a gate or a rule refused. */
export const stop = (run: Run, reason: string): number => {
  run.io.error(reason);
  return 1;
};

/** True after a message when `run` is in a linked git worktree, where `doing` names what the command does. */
export const refusedInWorktree = (run: Run, doing: string): boolean => {
  if (!inLinkedWorktree(run.store.root)) return false;
  run.io.error(
    `This is a linked git worktree. Only the main checkout ${doing}.`,
  );
  return true;
};

/**
 * The id of the one change that has the package `pkg`, or `null` with a message.
 * When more than one change has it, a change where the package is closed drops out, because a closed package does not move.
 */
export const changeOf = async (
  run: Run,
  pkg: string,
): Promise<string | null> => {
  const found: string[] = [];
  const open: string[] = [];
  for (const id of await run.store.changes()) {
    const events = await run.store.events(id);
    const state = events
      ? (await run.store.states(id, events))[pkg]
      : undefined;
    if (state === undefined) continue;
    found.push(id);
    if (!isClosed(state)) open.push(id);
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

/** The facts of one package that a command reads before its gate. */
export interface Target {
  readonly id: string;
  readonly events: readonly StateEvent[];
  readonly states: Readonly<Record<string, string>>;
  /** The state of the package: the last event, or `planned` for a package with a file and no event. */
  readonly state: PackageState;
  /** The file of the package, or undefined when the package has an event and no file. */
  readonly file: PackageFile | undefined;
}

/** The facts of the package `pkg`, or `null` after a message. It also refuses in a linked worktree, where `doing` names what the command does. */
export const targetOf = async (
  run: Run,
  pkg: string,
  doing: string,
): Promise<Target | null> => {
  if (refusedInWorktree(run, doing)) return null;
  const id = await changeOf(run, pkg);
  if (id === null) return null;
  const events = (await run.store.events(id)) ?? [];
  const change = changeState(events);
  if (change !== "planned" && change !== "implementing") {
    run.io.error(
      `The change \`${id}\` is \`${change}\`, and a command on its package \`${pkg}\` needs \`planned\` or \`implementing\`.`,
    );
    return null;
  }
  const states = await run.store.states(id, events);
  const state = states[pkg] ?? "planned";
  if (!isPackageState(state)) {
    run.io.error(`The package \`${pkg}\` has the unknown state \`${state}\`.`);
    return null;
  }
  const file = (await readPackages(run.store, id)).find((p) => p.id === pkg);
  return { id, events, states, state, file };
};

/** The state of a change from its events. It throws an `Error` on a state that a change does not have. */
export const changeState = (events: readonly StateEvent[]): ChangeState => {
  const state = lastState(events, undefined, CHANGE_INITIAL);
  if (!isChangeState(state))
    throw new Error(`The change has the unknown state \`${state}\`.`);
  return state;
};

const stamp = (run: Run): string => run.clock.now().toISOString();

/** Writes the `status` key of the file `file` to `status`. A missing file stays missing. */
const writeStatus = async (
  run: Run,
  file: string,
  status: string,
): Promise<void> => {
  const body = await run.store.files.read(file);
  if (body !== null) await run.store.write(file, withStatus(body, status));
};

/** Moves the package `pkg` of the change `id` to `state`: appends the event, and writes the `status` key of its file. */
export const movePackage = async (
  run: Run,
  id: string,
  pkg: string,
  state: string,
  evidence: Evidence = {},
): Promise<Moved> => {
  const events = (await run.store.events(id)) ?? [];
  const from = (await run.store.states(id, events))[pkg] ?? "planned";
  await run.store.appendEvent(id, {
    at: stamp(run),
    package: pkg,
    state,
    ...evidence,
  });
  const file = (await readPackages(run.store, id)).find((p) => p.id === pkg);
  if (file) await writeStatus(run, file.path, state);
  return { change: id, package: pkg, from, to: state, ...evidence };
};

/** Moves the change `id` to `state`: appends the event with no `package`, and writes the `status` key of `change.md`. */
export const moveChange = async (
  run: Run,
  id: string,
  state: string,
  evidence: Evidence = {},
): Promise<Moved> => {
  const events = (await run.store.events(id)) ?? [];
  const from = changeState(events);
  await run.store.appendEvent(id, { at: stamp(run), state, ...evidence });
  await writeStatus(run, path.posix.join(changeDir(id), "change.md"), state);
  return { change: id, from, to: state, ...evidence };
};
