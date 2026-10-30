// The cheap summarizer, pure over plain values: the request it makes and the compaction it answers
// with. The hook that calls the model is `compaction/hook.ts`.

import type {
	ModelCompleteRequest,
	ModelCompleteResult,
	ModelEffort,
	PluginOptions,
	SessionCompacted,
	SessionCompactInput,
} from "claude-code";
import { HAIKU_MODEL, type TierRow } from "./tiers/tiers.ts";

/** The value of the `cheapSummary` option that turns the handler on. */
const OPTION_ON = "on";

/**
 * Whether the cheap summary runs: the row field, or the option a person set by hand. No row has the
 * field on while no rows price the call, so today the option is the only way in, which is the
 * "the user turns it on by hand" case the specs leave open.
 */
export const isCheapSummaryOn = (
	row: TierRow | undefined,
	options: PluginOptions,
): boolean =>
	options["cheapSummary"] === OPTION_ON || row?.cheapSummary === true;

/** The reply cap of the one call, which bounds what the summary can cost. */
export const SUMMARY_MAX_TOKENS = 4000;

/** How long the call may take before the engine's own compaction answers instead. */
export const SUMMARY_TIMEOUT_MS = 90_000;

/** The fixed instructions. They ride a `cache: true` block, so a later call within five minutes reads them. */
export const SUMMARY_INSTRUCTIONS =
	"Summarize the conversation that follows so that work can continue from the summary alone. " +
	"Keep the task and its constraints, the decisions made and why, the files read and changed, " +
	"the commands run and their results, the errors met, and the next step. " +
	"Reply with the summary only.";

const EFFORTS: readonly string[] = ["low", "medium", "high", "xhigh", "max"];

const isEffort = (value: string | undefined): value is ModelEffort =>
	value !== undefined && EFFORTS.includes(value);

const transcriptOf = (e: SessionCompactInput): string =>
	e.messages.map((message) => `${message.role}: ${message.text}`).join("\n\n");

/**
 * The one request of a compaction, or none when nothing asks for it, the compaction is a subagent's
 * or a precompute, or the row names no effort the call can carry. The model and the effort are
 * explicit, so the call never inherits the session's. `isOn` is the switch of `isCheapSummaryOn`, and
 * the effort still comes from the row, so an unreadable login makes no call either way.
 */
export const summaryRequest = (
	row: TierRow | undefined,
	e: SessionCompactInput,
	isOn: boolean,
): ModelCompleteRequest | undefined => {
	if (
		!isOn ||
		e.agentId !== undefined ||
		e.trigger === "precompute" ||
		!isEffort(row?.effort)
	) {
		return undefined;
	}
	const stress = e.instructions === undefined ? "" : `${e.instructions}\n\n`;
	return {
		model: HAIKU_MODEL,
		effort: row.effort,
		maxTokens: SUMMARY_MAX_TOKENS,
		timeoutMs: SUMMARY_TIMEOUT_MS,
		prompt: [
			{ text: SUMMARY_INSTRUCTIONS, cache: true },
			{ text: `\n\n${stress}${transcriptOf(e)}` },
		],
	};
};

/**
 * The compaction that the summary stands for: the summary as the one message. It carries no `usage`,
 * which is how the engine reports that a hook answered rather than core.
 */
export const summaryCompaction = (summary: string): SessionCompacted => ({
	messages: [{ role: "user", text: summary, toolUses: [] }],
});

/** What the summarizer reaches the engine through, so a test hands it plain functions. */
export interface Ask {
	readonly complete: (
		request: ModelCompleteRequest,
	) => Promise<ModelCompleteResult>;
	readonly log: (line: string) => void;
}

/**
 * The compaction answered with the cheap summary, or none when the row asks for no summary or the
 * call fails, throws, is cut, or comes back empty. A failure of the call is one line to the user, and
 * the caller leaves the compaction to the engine.
 */
export const summarize = async (
	row: TierRow | undefined,
	e: SessionCompactInput,
	ask: Ask,
	isOn: boolean,
): Promise<SessionCompacted | undefined> => {
	const request = summaryRequest(row, e, isOn);
	if (request === undefined) {
		return undefined;
	}
	try {
		const reply = await ask.complete(request);
		if (reply.isAnswered && reply.text.trim() !== "") {
			return summaryCompaction(reply.text);
		}
		ask.log("Cheap summary came back empty, so the engine compacts");
	} catch (error) {
		ask.log(`Cheap summary failed (${error}), so the engine compacts`);
	}
	return undefined;
};
