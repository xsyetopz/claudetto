// The destructive floor of the `guard` slice: the first matcher of a command whose tier applies gives the deny reason.
// The `floor` tier applies in every session, and the `subagent` tier only in a subagent.
// The functions are pure, and the ports of the file system and of the checkout come in through `ctx`.

import { MATCHERS, TIERS } from "./matchers/index.ts";
import type { Ctx, Kind, Tier } from "./matchers/types.ts";
import { denyReason } from "./reason.ts";
import { walk } from "./walk.ts";

/** The context of a command: the ports of `Ctx`, and whether the caller is a subagent. */
export type GuardCtx = Ctx & { subagent: boolean };

/** The lookup of a path under `dir`, when `dir` is set and the path is relative. */
const under = (kind: Kind, dir: string | undefined): Kind =>
  dir === undefined
    ? kind
    : (path) => kind(path.startsWith("/") ? path : `${dir}/${path}`);

/**
 * The deny reason of `command`, or null when no matcher whose tier applies matches one of its simple commands.
 * A matcher of an unknown id has the `floor` tier, so it applies in every session.
 */
export const guardReason = async (
  command: string,
  ctx: GuardCtx,
): Promise<string | null> => {
  for (const simple of walk(command)) {
    const scoped: Ctx = {
      kind: under(ctx.kind, simple.dir),
      isMainCheckout: () => ctx.isMainCheckout(simple.dir),
    };
    for (const matcher of MATCHERS) {
      const tier: Tier = TIERS[matcher.id] ?? "floor";
      if (tier === "subagent" && !ctx.subagent) continue;
      if (await matcher.match(simple.words, scoped))
        return denyReason({ tier, command, subagent: ctx.subagent });
    }
  }
  return null;
};
