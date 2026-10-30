import { emptyReply } from "./answer.ts";
import { mentionsAny } from "./match.ts";

/** One phrase from each of the two prompts the agent status-line summarizer sends. */
export const MARKERS = [
	"3-5 words using present tense",
	"3-5 word progress label for a background agent",
] as const;

/** Matches on text, so a reworded prompt silently lets the summarizer through again. */
export const isSummary: (raw: string) => boolean = mentionsAny(MARKERS);

/** An empty answer, so no label is shown and `Ni` has nothing to accept, in the shape the request asked for. */
export const summaryAnswer = (raw: string): Response =>
	emptyReply(raw, {
		id: "msg_claudetto_summary_stub",
		requestId: "req_claudetto_summary_stub",
		model: "claude-haiku-5-5",
	});
