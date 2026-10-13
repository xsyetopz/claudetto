// `dotclaude-spec archive <id>`: applies the deltas of a change to a temporary copy of `.dotclaude/spec/specs/`,
// then replaces `.dotclaude/spec/specs/` and moves the change to `archive/`.
// When one delta fails, nothing changes.

import path from "node:path";
import {
  ARCHIVE_DIR,
  SPEC_ROOT,
  SPECS_DIR,
  SPECS_OLD,
  SPECS_TEMP,
} from "../../../../../kernel/paths.ts";
import { applyDelta } from "../domain/delta.ts";
import { parseDelta, parseSpec } from "../domain/parse.ts";
import { validateDelta, validateSpec } from "../domain/validate.ts";
import { CHANGE_ID } from "../limits.ts";
import { renderSpec } from "./render.ts";
import { dateOf, type Run } from "./run.ts";

/** The new text of each capability that the deltas change, or the problems that stop the archive. */
const applyAll = async (
  run: Run,
  deltaDir: string,
): Promise<{ texts: Map<string, string>; problems: string[] }> => {
  const texts = new Map<string, string>();
  const problems: string[] = [];
  for (const name of await run.store.markdown(deltaDir)) {
    const file = path.posix.join(deltaDir, name);
    const delta = parseDelta((await run.store.files.read(file)) ?? "");
    if (!delta.ok) {
      problems.push(
        ...delta.errors.map((e) => `${file}:${e.line}: ${e.message}`),
      );
      continue;
    }
    const issues = validateDelta(delta.value);
    problems.push(
      ...issues.map((i) => `${file}: ${i.rule} ${i.subject}: ${i.message}`),
    );
    const target = path.posix.join(SPECS_DIR, name);
    const previous = await run.store.files.read(target);
    const spec = parseSpec(previous ?? "");
    if (!spec.ok) {
      problems.push(
        ...spec.errors.map((e) => `${target}:${e.line}: ${e.message}`),
      );
      continue;
    }
    const applied = applyDelta(spec.value, delta.value);
    if (!applied.ok) {
      problems.push(
        ...applied.errors.map(
          (f) =>
            `${file}: ${f.section} \`${f.name}\` ${f.reason === "missing" ? "does not exist" : "exists already"}`,
        ),
      );
      continue;
    }
    const after = validateSpec(applied.value);
    problems.push(
      ...after.map((i) => `${target}: ${i.rule} ${i.subject}: ${i.message}`),
    );
    texts.set(
      name,
      renderSpec(name.replace(/\.md$/, ""), previous, applied.value),
    );
  }
  return { texts, problems };
};

/**
 * Puts the new `specs/` in place, and moves the change to `target`.
 * When a later step fails, the old `specs/` comes back, and the new one goes.
 */
const swap = (run: Run, dir: string, target: string): void => {
  const hadSpecs = run.store.exists(SPECS_DIR);
  let installed = false;
  try {
    if (hadSpecs) run.store.move(SPECS_DIR, SPECS_OLD);
    run.store.move(SPECS_TEMP, SPECS_DIR);
    installed = true;
    run.store.move(dir, target);
  } catch (error) {
    if (installed) run.store.remove(SPECS_DIR);
    if (hadSpecs && run.store.exists(SPECS_OLD))
      run.store.move(SPECS_OLD, SPECS_DIR);
    throw error;
  }
  run.store.remove(SPECS_OLD);
};

export const archiveCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const [id] = args;
  if (!id) {
    run.io.error("Usage: dotclaude-spec archive <id>");
    return 2;
  }
  if (!CHANGE_ID.test(id)) {
    run.io.error(`The id \`${id}\` is not a change id.`);
    return 1;
  }
  const dir = path.posix.join(SPEC_ROOT, id);
  const target = path.posix.join(ARCHIVE_DIR, `${dateOf(run.clock)}-${id}`);
  if (!run.store.exists(dir)) {
    run.io.error(`The change \`${id}\` does not exist in \`${SPEC_ROOT}\`.`);
    return 1;
  }
  if (run.store.exists(target)) {
    run.io.error(`\`${target}\` exists already.`);
    return 1;
  }
  if (run.store.exists(SPECS_OLD)) {
    run.io.error(
      `\`${SPECS_OLD}\` is left by an earlier archive that stopped, and it may hold the old \`${SPECS_DIR}\`. Check it, and remove it by hand before the archive.`,
    );
    return 1;
  }
  const { texts, problems } = await applyAll(
    run,
    path.posix.join(dir, "specs"),
  );
  if (problems.length > 0) {
    for (const line of problems) run.io.error(line);
    run.io.error(
      `Nothing changed: ${problems.length} problem${problems.length === 1 ? "" : "s"}.`,
    );
    return 1;
  }
  run.store.remove(SPECS_TEMP);
  if (run.store.exists(SPECS_DIR)) run.store.copyDir(SPECS_DIR, SPECS_TEMP);
  for (const [name, text] of texts)
    await run.store.write(path.posix.join(SPECS_TEMP, name), text);
  try {
    swap(run, dir, target);
  } catch (error) {
    run.io.error(
      `The archive of \`${id}\` failed, and \`${SPECS_DIR}\` is restored: ${(error as Error).message}`,
    );
    return 1;
  }
  run.io.log(
    `${target} (${texts.size} capabilit${texts.size === 1 ? "y" : "ies"} changed)`,
  );
  return 0;
};
