import type { EngineInterface, HookFor, On } from "claude-code";
import { readTier } from "../../tiers/read.ts";
import type { TierRow } from "../../tiers/tiers.ts";
import type { Block, BlockContext, WithOptions } from "../block.ts";
import { asCompaction } from "../window/hooks.ts";
import { isCheapSummaryOn, summarize } from "./summary.ts";

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

/** Every failure goes on to `next(e)`, because a compaction that does not happen ends the turn. */
export const onCompact: WithOptions<HookFor<"session.compact">> = (
	$,
	e,
	next,
	options,
) =>
	asCompaction(async () => {
		const row = await loginRow($);
		const answer = await summarize(
			row,
			e,
			{
				complete: (request) => $.model.complete(request),
				log: (line) => $.ui.log(line),
			},
			isCheapSummaryOn(row, options),
		);
		return answer ?? next(e);
	});

export const compaction: Block = {
	id: "compaction",
	kind: "session",
	routes: ["session.compact"],
	needs: "2.1.314",
};

export const attachCompaction = (on: On, context: BlockContext): void => {
	on("session.compact", ($, e, next) => onCompact($, e, next, context.options));
};
