// `dotclaude-spec retry <package> [--json]`: moves a package in `review` or `blocked` back to `doing`.
// It prints the findings of the last review that has findings, and the note of the last move to `blocked`.
// The next `implementer` of the package gets these lines in its brief.

import { eventsOf, lastFindings } from "../domain/events.ts";
import { parseArgs } from "./args.ts";
import { applyMove, changeOf, refusedInWorktree } from "./lane.ts";
import type { Run } from "./run.ts";

const USAGE = "Usage: dotclaude-spec retry <package> [--json]";

export const retryCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const parsed = parseArgs(args);
  if (typeof parsed === "string") {
    run.io.error(parsed);
    return 2;
  }
  const [pkg, extra] = parsed.words;
  if (!pkg || extra !== undefined) {
    run.io.error(USAGE);
    return 2;
  }
  if (refusedInWorktree(run, "changes a lane")) return 1;
  const id = await changeOf(run, pkg);
  if (id === null) return 1;
  const own = eventsOf((await run.store.events(id)) ?? [], pkg);
  const findings = lastFindings(own);
  const blockedNote = own.findLast((e) => e.lane === "blocked")?.note;
  const move = await applyMove(
    run,
    pkg,
    "doing",
    { note: "retry" },
    (before) =>
      before === "review" || before === "blocked"
        ? null
        : `The lane of \`${pkg}\` is \`${before}\`. Only a package in \`review\` or \`blocked\` gets a retry.`,
  );
  if (move === null) return 1;
  const reason = move.from === "blocked" ? blockedNote : undefined;
  if (parsed.json) {
    run.io.log(
      JSON.stringify({
        ...move,
        findings,
        ...(reason === undefined ? {} : { blocked: reason }),
      }),
    );
    return 0;
  }
  run.io.log(`${move.change}: ${pkg} ${move.from} -> doing`);
  if (reason !== undefined) run.io.log(`Blocked: ${reason}`);
  for (const finding of findings) run.io.log(`- ${finding}`);
  if (findings.length === 0 && reason === undefined)
    run.io.log(`No finding is stored for \`${pkg}\`.`);
  return 0;
};
