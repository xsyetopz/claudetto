// `dotclaude-spec status [<id>] [--json]` and `dotclaude-spec next [<id>]`: the states of the packages of a change.

import { PACKAGE_STATES } from "../domain/states.ts";
import { parseArgs } from "./args.ts";
import { readChange } from "./files.ts";
import { countStates, ICONS, iconOf, loadChange } from "./graph.ts";
import { type Run, resolveId } from "./run.ts";

const USAGE = "Usage: dotclaude-spec status [<id>] [--json]";

/** Prints the counts and the state of each package of the change. */
export const statusCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const parsed = parseArgs(args);
  if (typeof parsed === "string" || parsed.words.length > 1) {
    run.io.error(typeof parsed === "string" ? parsed : USAGE);
    return 2;
  }
  const id = await resolveId(run, parsed.words[0]);
  if (id === null) return 1;
  const loaded = await loadChange(run, id);
  if (loaded === null) return 1;
  const status = (await readChange(run.store, id))?.status ?? "draft";
  const counts = countStates(loaded.states);
  const packages = Object.entries(loaded.states).map(([name, state]) => ({
    id: name,
    state,
  }));
  const total = packages.length - (counts["canceled"] ?? 0);
  if (parsed.json) {
    run.io.log(
      JSON.stringify({
        id,
        status,
        done: counts["done"] ?? 0,
        total,
        states: counts,
        packages,
      }),
    );
    return 0;
  }
  run.io.log(`◆ ${id} ${status} ${counts["done"] ?? 0}/${total}`);
  run.io.log(
    PACKAGE_STATES.map((s) => `${ICONS[s]} ${counts[s] ?? 0}`).join("  "),
  );
  for (const p of packages) run.io.log(`${iconOf(p.state)} ${p.id} ${p.state}`);
  return 0;
};

/**
 * Prints the brief of the next package: the first in the order of wave and id
 * that is `planned` or `doing` and whose deps are all `done`.
 */
export const nextCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const id = await resolveId(run, args[0]);
  if (id === null) return 1;
  const loaded = await loadChange(run, id);
  if (loaded === null) return 1;
  const { states } = loaded;
  const next = loaded.packages
    .filter((p) => ["planned", "doing"].includes(states[p.id] ?? ""))
    .find((p) => p.deps.every((d) => states[d] === "done"));
  if (!next) {
    run.io.log(`No package of \`${id}\` is ready.`);
    return 0;
  }
  run.io.log(next.text.trimEnd());
  return 0;
};
