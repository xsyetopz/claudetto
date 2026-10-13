// `dotclaude-spec review <package> approve|reject [--finding <text>]... [--decision fix-code|revise-spec] [--json]`.
// `approve` moves a `verified` package to `approved` and records the SHA of its last `verify` event.
// `reject` needs a `--finding` and a `--decision`, and moves the package back to `doing`.

import { eventsOf, lastVerify } from "../domain/events.ts";
import { gateApprove, gateReject } from "../domain/gates.ts";
import { parseArgs } from "./args.ts";
import type { Run } from "./run.ts";
import {
  evidence,
  isDecision,
  movePackage,
  printMoved,
  stop,
  targetOf,
  usage,
} from "./transition.ts";

const USAGE =
  "Usage: dotclaude-spec review <package> approve|reject [--finding <text>]... [--decision fix-code|revise-spec] [--json]";

export const reviewCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const parsed = parseArgs(args, { values: ["decision"], lists: ["finding"] });
  if (typeof parsed === "string") return usage(run, parsed);
  const [pkg, verdict, extra] = parsed.words;
  const { decision } = parsed.values;
  const findings = parsed.lists["finding"] ?? [];
  if (
    !pkg ||
    (verdict !== "approve" && verdict !== "reject") ||
    extra !== undefined
  )
    return usage(run, USAGE);
  if (decision !== undefined && !isDecision(decision))
    return usage(run, "The decision is `fix-code` or `revise-spec`.");
  const target = await targetOf(run, pkg, "records a review");
  if (target === null) return 1;
  const { id, events, state } = target;
  if (state !== "verified")
    return stop(
      run,
      `The package \`${pkg}\` is \`${state}\`, and only a \`verified\` package is reviewed.`,
    );
  if (verdict === "reject") {
    const gate = gateReject({
      findings,
      ...evidence({ decision: isDecision(decision) ? decision : undefined }),
    });
    if (!gate.ok) return stop(run, gate.reason);
    const moved = await movePackage(run, id, pkg, "doing", {
      verdict,
      findings,
      ...(isDecision(decision) ? { decision } : {}),
    });
    printMoved(run, "review", moved, parsed.json);
    return 0;
  }
  const verified = lastVerify(eventsOf(events, pkg));
  const gate = gateApprove({ verify: verified });
  const sha = verified?.sha;
  if (!gate.ok || sha === undefined)
    return stop(run, gate.ok ? "The `verify` event has no SHA." : gate.reason);
  const moved = await movePackage(run, id, pkg, "approved", { verdict, sha });
  printMoved(run, "review", moved, parsed.json);
  return 0;
};
