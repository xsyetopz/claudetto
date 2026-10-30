// The hook that answers `session.compact`, and the one place where the summarizer meets `$`. The
// request is built in `summary.ts`. `register.ts` registers the hook by reference: the engine's loader
// follows `$` into another file only through a `function` declaration, which the lint rules forbid.
//
// The call is made only for a row that has `cheapSummary` on, and every failure of it, a throw, a cut
// call, or an empty reply, goes on to `next(e)`, because a compaction that does not happen ends the
// turn (`specs/compaction-path/spec.md`).

import type { EngineInterface, HookFor } from "claude-code";
import { keptOptions } from "../jev/options.ts";
import { isCheapSummaryOn, summarize } from "../summary.ts";
import { readTier } from "../tiers/read.ts";
import type { TierRow } from "../tiers/tiers.ts";
import { asCompaction } from "../window/hooks.ts";

/** The row of this login, read from `~/.claude.json`, or none when it cannot be read. */
const loginRow = async ($: EngineInterface): Promise<TierRow | undefined> => {
	try {
		const home = await $.env.get("HOME");
		if (home === undefined) {
			return undefined;
		}
		const login: unknown = JSON.parse(await $.fs.read(`${home}/.claude.json`));
		return readTier(login).row;
	} catch {
		return undefined;
	}
};

/**
 * `session.compact`: the compaction is tagged for the window recorder, and answered with the cheap
 * summary when the row asks for it. Anything else is the engine's own compaction.
 */
export const onCompact: HookFor<"session.compact"> = ($, e, next) =>
	asCompaction(async () => {
		const row = await loginRow($);
		const answer = await summarize(
			row,
			e,
			{
				complete: (request) => $.model.complete(request),
				log: (line) => $.ui.log(line),
			},
			isCheapSummaryOn(row, keptOptions()),
		);
		return answer ?? next(e);
	});
