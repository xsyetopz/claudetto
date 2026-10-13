// `dotclaude-spec validate [<id>]`: checks the files of the open changes and the capability specs.
// It checks the front matter, the `status` of each file against its last event, the requirement IDs,
// the sections of each package, the deps, and the `owns` of the open packages in one wave.

import path from "node:path";
import { SPEC_ROOT, SPECS_DIR } from "../../../../../kernel/paths.ts";
import { isClosed, type StateEvent } from "../../../../../kernel/spec-store.ts";
import { cycleMembers, missingDeps, ownsOverlaps } from "../domain/deps.ts";
import type { FormatError } from "../domain/formats.ts";
import { checkFront, type FrontKind } from "../domain/front.ts";
import { duplicateIds, requirementsOf } from "../domain/requirements.ts";
import {
  CHANGE_INITIAL,
  lastState,
  PACKAGE_INITIAL,
  statusRule,
} from "../domain/status.ts";
import { changeDir, readChange, readPackages } from "./files.ts";
import type { Run } from "./run.ts";
import type { SpecStore } from "./store.ts";

const formatErrors = (file: string, errors: readonly FormatError[]): string[] =>
  errors.map((e) => `${file}:${e.line}: ${e.message}`);

/** The problems of the front matter and of the requirement headings of `file`. */
const fileProblems = async (
  store: SpecStore,
  file: string,
  kind: FrontKind,
): Promise<string[]> => {
  const body = (await store.files.read(file)) ?? "";
  const front = checkFront(body, kind);
  return [
    ...(front.ok ? [] : formatErrors(file, front.errors)),
    ...formatErrors(file, requirementsOf(body).errors),
  ];
};

/** The problems of the capability specs in `.dotclaude/spec/specs/`, with the IDs that repeat across them. */
const specProblems = async (store: SpecStore): Promise<string[]> => {
  const out: string[] = [];
  const ids: number[] = [];
  for (const name of await store.markdown(SPECS_DIR)) {
    const file = path.posix.join(SPECS_DIR, name);
    out.push(...(await fileProblems(store, file, "spec")));
    for (const r of requirementsOf((await store.files.read(file)) ?? "")
      .requirements)
      ids.push(r.id);
  }
  for (const dup of duplicateIds(ids))
    out.push(
      `${SPECS_DIR}: duplicate requirement \`REQ-${dup}\` in the specs.`,
    );
  return out;
};

/** The problems of the files that hold the text of the change `id`: the change, the requirements, and the design. */
const textProblems = async (
  store: SpecStore,
  id: string,
): Promise<string[]> => {
  const dir = changeDir(id);
  const out: string[] = [];
  const change = await readChange(store, id);
  if (change === null)
    return [`${path.posix.join(dir, "change.md")}: the file is missing.`];
  out.push(...(await fileProblems(store, change.path, "change")));
  const ids: number[] = requirementsOf(change.text).requirements.map(
    (r) => r.id,
  );
  const reqDir = path.posix.join(dir, "requirements");
  for (const name of await store.markdown(reqDir)) {
    const file = path.posix.join(reqDir, name);
    out.push(...(await fileProblems(store, file, "requirements")));
    for (const r of requirementsOf((await store.files.read(file)) ?? "")
      .requirements)
      ids.push(r.id);
  }
  const design = path.posix.join(dir, "design.md");
  if (store.exists(design))
    out.push(...(await fileProblems(store, design, "design")));
  for (const dup of duplicateIds(ids))
    out.push(`${dir}: duplicate requirement \`REQ-${dup}\` in the change.`);
  return out;
};

/** The problems of the log and of the packages of the change `id`: the `status` copies, the deps, and the `owns`. */
const packageProblems = async (
  store: SpecStore,
  id: string,
): Promise<string[]> => {
  const dir = changeDir(id);
  const log = path.posix.join(dir, "events.jsonl");
  const out: string[] = [];
  let events: readonly StateEvent[] | null;
  try {
    events = await store.events(id);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  if (events === null) out.push(`${log}: the file is missing.`);
  const torn = await store.tornLine(id).catch(() => null);
  if (torn !== null)
    out.push(
      `${log}:${torn}: the last line has no line end and is not JSON, so the reader skips it.`,
    );
  const logged = events ?? [];
  const change = await readChange(store, id);
  if (change && events) {
    const rule = statusRule(change.status, logged, undefined, CHANGE_INITIAL);
    if (!rule.ok) out.push(`${change.path}: ${rule.reason}`);
  }
  const packages = await readPackages(store, id);
  for (const p of packages) {
    out.push(...p.errors);
    if (events) {
      const rule = statusRule(p.status, logged, p.id, PACKAGE_INITIAL);
      if (!rule.ok) out.push(`${p.path}: ${rule.reason}`);
    }
  }
  const known = new Set(packages.map((p) => p.id));
  for (const pkg of new Set(logged.map((e) => e.package)))
    if (pkg !== undefined && !known.has(pkg))
      out.push(`${log}: an event names \`${pkg}\`, which has no package file.`);
  const nodes = packages.map((p) => ({
    id: p.id,
    wave: p.wave,
    deps: p.deps,
    owns: p.owns,
  }));
  for (const [pkg, dep] of missingDeps(nodes))
    out.push(
      `${path.posix.join(dir, "packages")}: \`${pkg}\` needs \`${dep}\`, which has no file.`,
    );
  const cycle = cycleMembers(nodes);
  if (cycle.length > 0)
    out.push(
      `${path.posix.join(dir, "packages")}: dep cycle of ${cycle.join(", ")}.`,
    );
  const states = Object.fromEntries(packages.map((p) => [p.id, p.status]));
  for (const [a, b] of ownsOverlaps(nodes, states))
    out.push(
      `${path.posix.join(dir, "packages")}: \`${a}\` and \`${b}\` own the same paths in one wave.`,
    );
  return out;
};

/** The problems of a package ID that more than one change has as an open package. With `only`, only the IDs of that change. */
const sharedIdProblems = async (
  store: SpecStore,
  only: string | undefined,
): Promise<string[]> => {
  const owners = new Map<string, string[]>();
  for (const id of await store.changes()) {
    const events = await store.events(id).catch(() => null);
    if (events && isClosed(lastState(events, undefined, CHANGE_INITIAL)))
      continue;
    const states = events ? await store.states(id, events) : {};
    for (const p of await readPackages(store, id))
      if (!isClosed(states[p.id] ?? PACKAGE_INITIAL))
        owners.set(p.id, [...(owners.get(p.id) ?? []), id]);
  }
  return [...owners]
    .filter(
      ([, ids]) => ids.length > 1 && (only === undefined || ids.includes(only)),
    )
    .map(
      ([pkg, ids]) =>
        `${SPEC_ROOT}: the package \`${pkg}\` is open in these changes: ${ids.join(", ")}.`,
    );
};

export const validateCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const [only] = args;
  if (
    only !== undefined &&
    !run.store.exists(path.posix.join(SPEC_ROOT, only))
  ) {
    run.io.error(`The change \`${only}\` does not exist in \`${SPEC_ROOT}\`.`);
    return 1;
  }
  const ids = only === undefined ? await run.store.changes() : [only];
  const problems = await specProblems(run.store);
  for (const id of ids) {
    problems.push(
      ...(await textProblems(run.store, id)),
      ...(await packageProblems(run.store, id)),
    );
  }
  problems.push(...(await sharedIdProblems(run.store, only)));
  for (const line of problems) run.io.error(line);
  run.io.log(
    problems.length === 0
      ? "Valid."
      : `${problems.length} problem${problems.length === 1 ? "" : "s"}.`,
  );
  return problems.length === 0 ? 0 : 1;
};
