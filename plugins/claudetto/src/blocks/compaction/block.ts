import type { EngineInterface, HookFor, On } from "claude-code";
import { readTier } from "../../tiers/read.ts";
import type { TierRow } from "../../tiers/tiers.ts";
import type { Block, BlockContext, WithOptions } from "../block.ts";
import { atRoot } from "../handoff/root.ts";
import { asCompaction } from "../window/hooks.ts";
import { afterTurn, handOverTo, type Session } from "./handover.ts";
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

/** Every failure goes on to `next(e)`, so the engine's own compaction answers in place of a hook that failed. */
export const onCompact: WithOptions<HookFor<"session.compact">> = (
	$,
	e,
	next,
	options,
) =>
	asCompaction(async () => {
		const handover = handOverTo(e);
		if (handover !== undefined) {
			return handover;
		}
		const row = await loginRow($);
		const answer = await summarize(
			e,
			{
				complete: (request) => $.model.complete(request),
				log: (line) => $.ui.log(line),
			},
			isCheapSummaryOn(row, options),
		);
		return answer ?? next(e);
	});

const sessionOf = ($: EngineInterface): Session => ({
	write: async (path, text) =>
		$.fs.write(atRoot(await $.session.root(), path), text),
	compact: () => $.command.run({ command: "compact" }),
	submit: (text) => $.prompt.submit({ text }),
	log: (line) => $.ui.log(line),
	context: async () => (await $.session.usage()).context,
	fork: (prompt) => $.model.fork({ prompt }),
});

/** Runs from a timer: `$.command.run` is queued until the session is idle, and it is not idle while this hook runs. */
export const onTurnEnd: WithOptions<HookFor<"turn.complete">> = async (
	$,
	e,
	next,
	options,
) => {
	const answer = await next(e);
	if (e.agentId === undefined && e.reason === "answer") {
		const session = sessionOf($);
		$.clock.after(0, () => {
			afterTurn(session, e.answer, options).catch((error: unknown) =>
				$.ui.log(`The handover failed (${error})`),
			);
		});
	}
	return answer;
};

export const compaction: Block = {
	id: "compaction",
	kind: "session",
	routes: ["session.compact", "turn.complete"],
	needs: "2.1.314",
};

export const attachCompaction = (on: On, context: BlockContext): void => {
	on("session.compact", ($, e, next) => onCompact($, e, next, context.options));
	on("turn.complete", { isAborted: [false] }, ($, e, next) =>
		onTurnEnd($, e, next, context.options),
	);
};
