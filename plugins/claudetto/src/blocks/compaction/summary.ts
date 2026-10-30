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

/** The reply cap, which bounds what the summary can cost. */
export const SUMMARY_MAX_TOKENS = 4000;

/** How long the call may take before the engine's own compaction answers instead. */
export const SUMMARY_TIMEOUT_MS = 90_000;

/** The fixed instructions ride a `cache: true` block, so a call within five minutes reads them. */
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

/** The model and effort are explicit, so the call never inherits the session's. */
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
