import type {
	ModelCompleteRequest,
	ModelCompleteResult,
	ModelEffort,
	PluginOptions,
	SessionCompacted,
	SessionCompactInput,
} from "claude-code";
import { HAIKU_MODEL, type TierRow } from "../../tiers/tiers.ts";

const OPTION_ON = "on";

/** No tier row turns the field on while no row prices the call, so today the option is the only switch. */
export const isCheapSummaryOn = (
	row: TierRow | undefined,
	options: PluginOptions,
): boolean =>
	options["cheapSummary"] === OPTION_ON || row?.cheapSummary === true;

/** The summary's length, which every turn after the compaction carries. */
export const SUMMARY_MAX_CHARS = 4000;

/** Above the limit in tokens, so the token cap never cuts a reply that the character limit would keep. */
export const SUMMARY_MAX_TOKENS = 2000;

/** How long the call may take before the engine's own compaction answers instead. */
export const SUMMARY_TIMEOUT_MS = 90_000;

/** The fixed instructions ride a `cache: true` block, so a call within five minutes reads them. */
export const SUMMARY_INSTRUCTIONS =
	"Summarize the conversation that follows so that work can continue from the summary alone. " +
	`Write at most ${SUMMARY_MAX_CHARS} characters, in short lines. ` +
	"Put first what the next turn needs most: the state of the work, what is unverified or uncommitted, and the next steps. " +
	"Then the user's standing instructions and open questions. " +
	"Name a file, commit, or plan by its path in place of restating what it holds, because the next turn can read it. " +
	"Reply with the summary only.";

/** Not the row's `effort`, which is the main session's `effortLevel`. */
export const SUMMARY_EFFORT: ModelEffort = "high";

const transcriptOf = (e: SessionCompactInput): string =>
	e.messages.map((message) => `${message.role}: ${message.text}`).join("\n\n");

/** The model and effort are explicit, so the call never inherits the session's. */
export const summaryRequest = (
	e: SessionCompactInput,
	isOn: boolean,
): ModelCompleteRequest | undefined => {
	if (!isOn || e.agentId !== undefined || e.trigger === "precompute") {
		return undefined;
	}
	const stress = e.instructions === undefined ? "" : `${e.instructions}\n\n`;
	return {
		model: HAIKU_MODEL,
		effort: SUMMARY_EFFORT,
		maxTokens: SUMMARY_MAX_TOKENS,
		timeoutMs: SUMMARY_TIMEOUT_MS,
		prompt: [
			{ text: SUMMARY_INSTRUCTIONS, cache: true },
			{ text: `\n\n${stress}${transcriptOf(e)}` },
		],
	};
};

/** Cut at a line break, so the summary ends on a whole line, and the most needed lines come first. */
const withinLimit = (text: string): string => {
	if (text.length <= SUMMARY_MAX_CHARS) {
		return text;
	}
	const end = text.lastIndexOf("\n", SUMMARY_MAX_CHARS);
	return text.slice(0, end < 0 ? SUMMARY_MAX_CHARS : end).trimEnd();
};

/** No `usage`: that is how the engine knows a hook answered, not core. */
export const summaryCompaction = (summary: string): SessionCompacted => ({
	messages: [{ role: "user", text: summary, toolUses: [] }],
});

export interface Ask {
	readonly complete: (
		request: ModelCompleteRequest,
	) => Promise<ModelCompleteResult>;
	readonly log: (line: string) => void;
}

export const summarize = async (
	e: SessionCompactInput,
	ask: Ask,
	isOn: boolean,
): Promise<SessionCompacted | undefined> => {
	const request = summaryRequest(e, isOn);
	if (request === undefined) {
		return undefined;
	}
	try {
		const reply = await ask.complete(request);
		if (reply.isAnswered && reply.text.trim() !== "") {
			if (reply.text.length > SUMMARY_MAX_CHARS) {
				ask.log(
					`Cheap summary ran to ${reply.text.length} characters, so it was cut to ${SUMMARY_MAX_CHARS}`,
				);
			}
			return summaryCompaction(withinLimit(reply.text));
		}
		ask.log("Cheap summary came back empty, so the engine compacts");
	} catch (error) {
		ask.log(`Cheap summary failed (${error}), so the engine compacts`);
	}
	return undefined;
};
