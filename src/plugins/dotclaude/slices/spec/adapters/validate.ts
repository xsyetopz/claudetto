// `dotclaude-spec validate [<id>]`: checks the specs, the deltas, the tasks, and the packages.
// It also checks that no two open packages in one wave have overlapping `owns`.

import path from "node:path";
import { SPEC_ROOT } from "../../../../../kernel/spec-store.ts";
import type { FormatError, Package } from "../domain/formats.ts";
import { parseDelta, parseSpec } from "../domain/parse.ts";
import { parseTasks } from "../domain/plan.ts";
import {
  type Issue,
  validateDelta,
  validateDeps,
  validatePackage,
  validateSpec,
  validateTasks,
  validateWave,
} from "../domain/validate.ts";
import { SPECS_DIR } from "../limits.ts";
import { readBriefs, readEntries } from "./plan-files.ts";
import type { Run } from "./run.ts";
import type { SpecStore } from "./store.ts";

const formatErrors = (file: string, errors: FormatError[]): string[] =>
  errors.map((e) => `${file}:${e.line}: ${e.message}`);

const issueLines = (file: string, issues: Issue[]): string[] =>
  issues.map((i) => `${file}: ${i.rule} ${i.subject}: ${i.message}`);

/** The problems of the capability specs in `spec/specs/`. */
const specProblems = async (store: SpecStore): Promise<string[]> => {
  const out: string[] = [];
  for (const name of await store.markdown(SPECS_DIR)) {
    const file = path.posix.join(SPECS_DIR, name);
    const parsed = parseSpec((await store.files.read(file)) ?? "");
    out.push(
      ...(parsed.ok
        ? issueLines(file, validateSpec(parsed.value))
        : formatErrors(file, parsed.errors)),
    );
  }
  return out;
};

/** The problems of the tasks of `change.md` and of the delta files of the change. */
const changeProblems = async (
  store: SpecStore,
  id: string,
): Promise<string[]> => {
  const dir = path.posix.join(SPEC_ROOT, id);
  const out: string[] = [];
  const change = await store.files.read(path.posix.join(dir, "change.md"));
  if (change !== null) {
    const tasks = parseTasks(change);
    out.push(
      ...(tasks.ok
        ? issueLines(
            path.posix.join(dir, "change.md"),
            validateTasks(tasks.value),
          )
        : formatErrors(path.posix.join(dir, "change.md"), tasks.errors)),
    );
  }
  for (const name of await store.markdown(path.posix.join(dir, "specs"))) {
    const file = path.posix.join(dir, "specs", name);
    const delta = parseDelta((await store.files.read(file)) ?? "");
    out.push(
      ...(delta.ok
        ? issueLines(file, validateDelta(delta.value))
        : formatErrors(file, delta.errors)),
    );
  }
  return out;
};

/** A package of the list that has no brief, for the check of the deps. */
const placeholder = (id: string): Package => ({
  front: { id, deps: [], owns: [], verify: "", agent: "" },
  sections: {
    Goal: "",
    Context: "",
    Steps: "",
    Acceptance: "",
    Boundaries: "",
  },
});

/** The problems of the briefs, of their deps, and of the owns of the open packages of each wave. */
const packageProblems = async (
  store: SpecStore,
  id: string,
): Promise<string[]> => {
  const dir = path.posix.join(SPEC_ROOT, id);
  const { packages, failures } = await readBriefs(store, id);
  const entries = await readEntries(store, id);
  const state = await store.state(id);
  const out = failures.flatMap((f) => formatErrors(f.file, f.errors));
  out.push(
    ...packages.flatMap((p) =>
      issueLines(path.posix.join(dir, "packages"), validatePackage(p)),
    ),
  );
  const known = new Set(packages.map((p) => p.front.id));
  const listed = entries
    .filter((e) => !known.has(e.id))
    .map((e) => placeholder(e.id));
  out.push(
    ...issueLines(
      path.posix.join(dir, "packages"),
      validateDeps([...packages, ...listed]),
    ),
  );
  const lanes = state ? await store.lanes(id, state) : {};
  const open = (pkg: Package): boolean => lanes[pkg.front.id] !== "done";
  const waves = new Set(entries.map((e) => e.wave));
  for (const wave of waves) {
    const inWave = new Set(
      entries.filter((e) => e.wave === wave).map((e) => e.id),
    );
    const group = packages.filter((p) => inWave.has(p.front.id) && open(p));
    out.push(
      ...issueLines(
        `${path.posix.join(dir, "packages.md")} wave ${wave}`,
        validateWave(group),
      ),
    );
  }
  return out;
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
      ...(await changeProblems(run.store, id)),
      ...(await packageProblems(run.store, id)),
    );
  }
  for (const line of problems) run.io.error(line);
  run.io.log(
    problems.length === 0
      ? "Valid."
      : `${problems.length} problem${problems.length === 1 ? "" : "s"}.`,
  );
  return problems.length === 0 ? 0 : 1;
};
