// `dotclaude-spec ready [<id>]`: the packages that can start now.
// A package is ready when its lane is `planned`, each dep is `done`,
// and its `owns` do not overlap the `owns` of a package in `doing` or `review`.

import { ownsOverlap } from "../domain/validate.ts";
import { readBriefs, readEntries } from "./plan-files.ts";
import { type Run, resolveId } from "./run.ts";

/** Prints the id of each ready package of the change, one for each line, in the order of `packages.md`. */
export const readyCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const id = await resolveId(run, args[0]);
  if (id === null) return 1;
  const events = await run.store.events(id);
  if (events === null) {
    run.io.error(`The change \`${id}\` has no \`events.jsonl\`.`);
    return 1;
  }
  const lanes = await run.store.lanes(id, events);
  const { packages } = await readBriefs(run.store, id);
  const order = (await readEntries(run.store, id)).map((e) => e.id);
  const rank = (pkg: string): number => {
    const i = order.indexOf(pkg);
    return i < 0 ? order.length : i;
  };
  const busy = packages.filter((p) =>
    ["doing", "review"].includes(lanes[p.front.id] ?? ""),
  );
  const ready = packages
    .filter((p) => lanes[p.front.id] === "planned")
    .filter((p) => p.front.deps.every((d) => lanes[d] === "done"))
    .filter((p) => !busy.some((b) => ownsOverlap(p.front.owns, b.front.owns)))
    .sort((a, b) => rank(a.front.id) - rank(b.front.id));
  if (ready.length === 0) {
    run.io.log(`No package of \`${id}\` is ready.`);
    return 0;
  }
  for (const pkg of ready) run.io.log(pkg.front.id);
  return 0;
};
