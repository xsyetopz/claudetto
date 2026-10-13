// `dotclaude-spec plan <id> [--json]`: moves a `specified` change to `planned`.
// Each package passes its format check, each requirement is in the `satisfies` of a package, and each `satisfies` ID exists.

import { gatePlan } from "../domain/change-gates.ts";
import { coverageOf, requirementsOf } from "../domain/requirements.ts";
import { CHANGE_TRANSITIONS, hasTransition } from "../domain/states.ts";
import { parseArgs } from "./args.ts";
import { changeSources, readPackages, requirementSources } from "./files.ts";
import type { Run } from "./run.ts";
import {
  changeState,
  moveChange,
  printMoved,
  refusedInWorktree,
  stop,
  usage,
} from "./transition.ts";

const USAGE = "Usage: dotclaude-spec plan <id> [--json]";

export const planCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const parsed = parseArgs(args);
  if (typeof parsed === "string") return usage(run, parsed);
  const [id, extra] = parsed.words;
  if (!id || extra !== undefined) return usage(run, USAGE);
  if (refusedInWorktree(run, "plans a change")) return 1;
  const events = await run.store.events(id);
  if (events === null) return stop(run, `The change \`${id}\` does not exist.`);
  const state = changeState(events);
  if (
    !hasTransition(CHANGE_TRANSITIONS, {
      from: state,
      command: "plan",
      to: "planned",
    })
  )
    return stop(
      run,
      `The change \`${id}\` is \`${state}\`, and only a \`specified\` change is planned.`,
    );
  const packages = await readPackages(run.store, id);
  if (packages.length === 0)
    return stop(run, `The change \`${id}\` has no package file.`);
  const ids = requirementSources(await changeSources(run.store, id)).flatMap(
    (s) => requirementsOf(s.text).requirements.map((r) => r.id),
  );
  const coverage = coverageOf(
    ids,
    packages.flatMap((p) => p.satisfies),
  );
  const gate = gatePlan({
    packageErrors: packages.filter((p) => p.errors.length > 0).length,
    ...coverage,
  });
  if (!gate.ok) {
    for (const p of packages) for (const e of p.errors) run.io.error(e);
    return stop(run, gate.reason);
  }
  printMoved(run, "plan", await moveChange(run, id, "planned"), parsed.json);
  return 0;
};
