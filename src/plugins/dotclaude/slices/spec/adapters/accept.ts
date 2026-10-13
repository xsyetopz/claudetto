// `dotclaude-spec accept <id> [--json]`: moves an `implementing` change to `accepted`.
// Each package must be `done` or `canceled`. The trace check passes zero orphans and zero uncited lines until `trace` exists.

import { gateAccept } from "../domain/change-gates.ts";
import {
  CHANGE_TRANSITIONS,
  hasTransition,
  isPackageState,
} from "../domain/states.ts";
import { parseArgs } from "./args.ts";
import type { Run } from "./run.ts";
import {
  changeState,
  moveChange,
  printMoved,
  refusedInWorktree,
  stop,
  usage,
} from "./transition.ts";

const USAGE = "Usage: dotclaude-spec accept <id> [--json]";

export const acceptCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const parsed = parseArgs(args);
  if (typeof parsed === "string") return usage(run, parsed);
  const [id, extra] = parsed.words;
  if (!id || extra !== undefined) return usage(run, USAGE);
  if (refusedInWorktree(run, "accepts a change")) return 1;
  const events = await run.store.events(id);
  if (events === null) return stop(run, `The change \`${id}\` does not exist.`);
  const state = changeState(events);
  if (
    !hasTransition(CHANGE_TRANSITIONS, {
      from: state,
      command: "accept",
      to: "accepted",
    })
  )
    return stop(
      run,
      `The change \`${id}\` is \`${state}\`, and only an \`implementing\` change is accepted.`,
    );
  const packages = Object.values(await run.store.states(id, events));
  if (packages.length === 0)
    return stop(run, `The change \`${id}\` has no package.`);
  const gate = gateAccept({
    packages: packages.filter(isPackageState),
    orphans: 0,
    uncited: 0,
  });
  if (!gate.ok) return stop(run, gate.reason);
  printMoved(run, "accept", await moveChange(run, id, "accepted"), parsed.json);
  return 0;
};
