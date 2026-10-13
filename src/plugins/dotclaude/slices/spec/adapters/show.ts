// `dotclaude-spec show <id> [<package>] [--json]`: one change, or one package of it.
// A change shows its size, its lane counts, and the lane of each package.
// A package shows its lane, its goal, its deps with their lanes, its `owns`, its `verify`, and its last events.

import path from "node:path";
import { SPEC_ROOT } from "../../../../../kernel/paths.ts";
import { eventsOf, eventText } from "../domain/events.ts";
import { SHOW_EVENTS_MAX } from "../limits.ts";
import { parseArgs } from "./args.ts";
import { laneCounts, sizeOf } from "./list.ts";
import { readBriefs, readEntries } from "./plan-files.ts";
import { type Run, resolveId } from "./run.ts";

const USAGE = "Usage: dotclaude-spec show <id> [<package>] [--json]";

/** Prints the change `id`. Gives the exit status. */
const showChange = async (
  run: Run,
  id: string,
  json: boolean,
): Promise<number> => {
  const events = (await run.store.events(id)) ?? [];
  const lanes = await run.store.lanes(id, events);
  const order = (await readEntries(run.store, id)).map((e) => e.id);
  const packages = [
    ...order.filter((p) => p in lanes),
    ...Object.keys(lanes).filter((p) => !order.includes(p)),
  ].map((p) => ({ id: p, lane: lanes[p] }));
  const change = {
    id,
    size: sizeOf(run, path.posix.join(SPEC_ROOT, id)),
    lanes: await laneCounts(run, id),
    packages,
  };
  if (json) {
    run.io.log(JSON.stringify(change));
    return 0;
  }
  run.io.log(`◆ ${id}  ${change.size}`);
  for (const p of packages) run.io.log(`${p.id}  ${p.lane}`);
  return 0;
};

/** Prints the package `pkg` of the change `id`. Gives the exit status. */
const showPackage = async (
  run: Run,
  id: string,
  pkg: string,
  json: boolean,
): Promise<number> => {
  const events = (await run.store.events(id)) ?? [];
  const lanes = await run.store.lanes(id, events);
  const brief = (await readBriefs(run.store, id)).packages.find(
    (p) => p.front.id === pkg,
  );
  if (!brief && !(pkg in lanes)) {
    run.io.error(`The change \`${id}\` has no package \`${pkg}\`.`);
    return 1;
  }
  const front = brief?.front;
  const shown = {
    change: id,
    package: pkg,
    lane: lanes[pkg],
    goal: brief?.sections.Goal.trim() ?? "",
    deps: (front?.deps ?? []).map((d) => ({ id: d, lane: lanes[d] })),
    owns: front?.owns ?? [],
    verify: front?.verify ?? "",
    events: eventsOf(events, pkg).slice(-SHOW_EVENTS_MAX),
  };
  if (json) {
    run.io.log(JSON.stringify(shown));
    return 0;
  }
  run.io.log(`${pkg}  ${shown.lane}  (${id})`);
  if (shown.goal) run.io.log(shown.goal);
  run.io.log(
    `Deps: ${shown.deps.map((d) => `${d.id} ${d.lane}`).join(", ") || "none"}`,
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
