// `dotclaude-spec drop <package|change> --reason <text> [--json]`: cancels a package, or a change before it is `accepted`.
// When a folder with the name exists in the store, the name is a change. Otherwise the name is a package.
// A dropped change cancels each open package of the change, with the same reason, before the change itself.
// `canceled` is a state that a package does not leave. A package that depends on it does not become ready.

import { isClosed } from "../../../../../kernel/spec-store.ts";
import { gateReason } from "../domain/gates.ts";
import {
  CHANGE_TRANSITIONS,
  hasTransition,
  PACKAGE_TRANSITIONS,
} from "../domain/states.ts";
import { parseArgs } from "./args.ts";
import { readPackages } from "./files.ts";
import type { Run } from "./run.ts";
import {
  changeState,
  type Moved,
  moveChange,
  movePackage,
  printMoved,
  refusedInWorktree,
  stop,
  targetOf,
  usage,
} from "./transition.ts";

const USAGE =
  "Usage: dotclaude-spec drop <package|change> --reason <text> [--json]";

/** Cancels each open package of the change `id` with `reason`, and gives the moves. */
const cancelPackages = async (
  run: Run,
  id: string,
  reason: string,
): Promise<Moved[]> => {
  const events = (await run.store.events(id)) ?? [];
  const states = await run.store.states(id, events);
  const ids = new Set([
    ...(await readPackages(run.store, id)).map((p) => p.id),
    ...Object.keys(states),
  ]);
  const moved: Moved[] = [];
  for (const pkg of [...ids].sort()) {
    const from = states[pkg] ?? "planned";
    if (isClosed(from)) continue;
    moved.push(await movePackage(run, id, pkg, "canceled", { note: reason }));
  }
  return moved;
};

export const dropCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const parsed = parseArgs(args, { values: ["reason"] });
  if (typeof parsed === "string") return usage(run, parsed);
  const [name, extra] = parsed.words;
  const { reason } = parsed.values;
  if (!name || extra !== undefined) return usage(run, USAGE);
  const gate = gateReason(reason, "drop");
  if (!gate.ok || reason === undefined)
    return usage(run, gate.ok ? USAGE : gate.reason);
  if ((await run.store.changes()).includes(name)) {
    if (refusedInWorktree(run, "cancels a change")) return 1;
    const state = changeState((await run.store.events(name)) ?? []);
    if (
      !hasTransition(CHANGE_TRANSITIONS, {
        from: state,
        command: "drop",
        to: "canceled",
      })
    )
      return stop(
        run,
        `The change \`${name}\` is \`${state}\`, and \`drop\` cannot cancel it.`,
      );
    for (const moved of await cancelPackages(run, name, reason))
      printMoved(run, "drop", moved, parsed.json);
    printMoved(
      run,
      "drop",
      await moveChange(run, name, "canceled", { note: reason }),
      parsed.json,
    );
    return 0;
  }
  const target = await targetOf(run, name, "cancels a package");
  if (target === null) return 1;
  const { id, state } = target;
  if (
    !hasTransition(PACKAGE_TRANSITIONS, {
      from: state,
      command: "drop",
      to: "canceled",
    })
  )
    return stop(
      run,
      `The package \`${name}\` is \`${state}\`, and \`drop\` cannot cancel it.`,
    );
  printMoved(
    run,
    "drop",
    await movePackage(run, id, name, "canceled", { note: reason }),
    parsed.json,
  );
  return 0;
};
