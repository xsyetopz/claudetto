// `dotclaude-spec show <id> [<package>] [--json]`: one change, or one package of it.
// A change shows its size, its status, its state counts, and the state of each package.
// A package shows its state, its goal, its deps with their states, its `owns`, its `verify`, and its last events.

import { sectionOf } from "../domain/brief.ts";
import { eventsOf, eventText } from "../domain/events.ts";
import { SHOW_EVENTS_MAX } from "../limits.ts";
import { parseArgs } from "./args.ts";
import { readChange } from "./files.ts";
import { countStates, loadChange } from "./graph.ts";
import { type Run, resolveId } from "./run.ts";

const USAGE = "Usage: dotclaude-spec show <id> [<package>] [--json]";

/** Prints the change `id`. Gives the exit status. */
const showChange = async (
  run: Run,
  id: string,
  json: boolean,
): Promise<number> => {
  const loaded = await loadChange(run, id);
  if (loaded === null) return 1;
  const change = await readChange(run.store, id);
  const order = loaded.packages.map((p) => p.id);
  const ids = [
    ...order,
    ...Object.keys(loaded.states).filter((p) => !order.includes(p)),
  ];
  const shown = {
    id,
    size: change?.size ?? "",
    status: change?.status ?? "",
    states: countStates(loaded.states),
    packages: ids.map((p) => ({ id: p, state: loaded.states[p] })),
  };
  if (json) {
    run.io.log(JSON.stringify(shown));
    return 0;
  }
  run.io.log(`◆ ${id}  ${shown.size}  ${shown.status}`);
  for (const p of shown.packages) run.io.log(`${p.id}  ${p.state}`);
  return 0;
};

/** Prints the package `pkg` of the change `id`. Gives the exit status. */
const showPackage = async (
  run: Run,
  id: string,
  pkg: string,
  json: boolean,
): Promise<number> => {
  const loaded = await loadChange(run, id);
  if (loaded === null) return 1;
  const file = loaded.packages.find((p) => p.id === pkg);
  if (!file && !(pkg in loaded.states)) {
    run.io.error(`The change \`${id}\` has no package \`${pkg}\`.`);
    return 1;
  }
  const shown = {
    change: id,
    package: pkg,
    state: loaded.states[pkg],
    goal: sectionOf(file?.text ?? "", "Goal"),
    deps: (file?.deps ?? []).map((d) => ({ id: d, state: loaded.states[d] })),
    owns: file?.owns ?? [],
    verify: file?.verify ?? "",
    events: eventsOf(loaded.events, pkg).slice(-SHOW_EVENTS_MAX),
  };
  if (json) {
    run.io.log(JSON.stringify(shown));
    return 0;
  }
  run.io.log(`${pkg}  ${shown.state}  (${id})`);
  if (shown.goal) run.io.log(shown.goal);
  run.io.log(
    `Deps: ${shown.deps.map((d) => `${d.id} ${d.state}`).join(", ") || "none"}`,
  );
  run.io.log(`Owns: ${shown.owns.join(", ") || "none"}`);
  if (shown.verify) run.io.log(`Verify: ${shown.verify}`);
  for (const e of shown.events) run.io.log(eventText(e));
  return 0;
};

export const showCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const parsed = parseArgs(args);
  if (typeof parsed === "string") {
    run.io.error(parsed);
    return 2;
  }
  const [given, pkg, extra] = parsed.words;
  if (!given || extra !== undefined) {
    run.io.error(USAGE);
    return 2;
  }
  const id = await resolveId(run, given);
  if (id === null) return 1;
  return pkg === undefined
    ? showChange(run, id, parsed.json)
    : showPackage(run, id, pkg, parsed.json);
};
