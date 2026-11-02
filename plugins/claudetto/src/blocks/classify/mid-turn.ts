import type { HookFor, SessionMessage } from "claude-code";
import { changeLedger } from "../run-limits/ledger.ts";

export interface MidTurnPrompt {
	readonly text: string;
	/** The id of the agent's newest call when the person pressed Enter. */
	readonly after?: string;
}

const promptsRef = { plugin: "claudetto", key: "prompts" } as const;

const PROMPTS_KEPT_MAX = 64;

const lastCallOf = (messages: readonly SessionMessage[]): string | undefined =>
	messages
		.flatMap((message) => message.toolUses.map((use) => use.tool_use_id))
		.at(-1);

// The row view leaves out a message typed while a turn runs, so without this record the classifier reads the agent's next call as unasked.
export const onMidTurnPrompt: HookFor<"prompt.submit"> = async ($, e, next) => {
	if (e.turnId !== undefined && e.isMeta !== true) {
		const after = lastCallOf(await $.session.messages().catch(() => []));
		const sent: MidTurnPrompt =
			after === undefined ? { text: e.text } : { text: e.text, after };
		await changeLedger<readonly MidTurnPrompt[], true>(
			{
				held: () => $.state.get(promptsRef),
				save: async (prompts, version) =>
					(await $.state.set(promptsRef, prompts, { ifVersion: version }))
						.isSet,
			},
			(held) => ({
				next: [...(held ?? []), sent].slice(-PROMPTS_KEPT_MAX),
				out: true,
			}),
		).catch(() => undefined);
	}
	return next(e);
};
