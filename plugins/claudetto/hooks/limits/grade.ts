import type { BackgroundTaskSummary, EngineInterface } from "claude-code";

import { taskLines } from "../cleanup.ts";
import { type GradeFault, VERIFY_BLOCK, VERIFY_GRADE } from "../texts-grade.ts";
import { claimTurn, parseFaults } from "../verify.ts";

/** The codes sonnet grades beside `unseen`: its answer on `fallback` is dropped; its `credited` vote is ORed with haiku's (on a replay, haiku alone missed 4 of 12, and sonnet missed 5 of 12 but flagged 0 of 30 clean replies). */
const UNSEEN_PEERS: GradeFault[] = ["credited", "fallback"];

/** The codes the haiku call is offered: a lookup this turn rules out `unchecked` and `rules`; a failed last Bash call offers `unfixed`; a headless session, which no ask reaches, is not offered `options`. */
export const offeredCodes = (
	looked: boolean,
	failed: boolean,
	interactive: boolean,
): GradeFault[] => [
	"credited",
	"fallback",
	"deferred",
	...(interactive ? (["options"] as const) : []),
	...(looked ? [] : (["unchecked", "rules"] as const)),
	...(failed ? (["unfixed"] as const) : []),
];

/** What each model call of one grading shares: the turn, its final reply, and the background tasks. */
interface Graded {
	readonly turn: ReturnType<typeof claimTurn>;
	readonly reply: string;
	readonly tasks: readonly BackgroundTaskSummary[];
}

/** The faults of `list` that one model call finds, narrowed to those in `keep`; a call that failed or went unanswered finds none. */
async function gradeOnce(
	$: EngineInterface,
	{ turn, reply, tasks }: Graded,
	{
		model,
		list,
		results,
		keep = list,
	}: {
		readonly model: "haiku" | "sonnet";
		readonly list: readonly GradeFault[];
		readonly results: readonly string[];
		readonly keep?: readonly GradeFault[];
	},
): Promise<GradeFault[]> {
	const r = await $.model
		.complete({
			model,
			prompt: VERIFY_GRADE(
				turn.people,
				turn.shown,
				turn.user,
				reply,
				list,
				results,
				taskLines(tasks),
				turn.failed,
			),
			maxTokens: 300,
			timeoutMs: 15_000,
		})
		.catch(() => void 0);
	return r?.isAnswered === true
		? parseFaults(r.text, list, reply).filter((code) => keep.includes(code))
		: [];
}

/**
 * The block for the faults one model call finds in the final reply. The call grades the reply against the person messages and the earlier
 * assistant messages; a fault the turn's own calls rule out (a lookup made, an ask call) is left off the list the model sees.
 * A failed, timed-out, or unreadable answer passes.
 */
export async function gradeBlock(
	$: EngineInterface,
	e: {
		readonly last_assistant_message?: string | undefined;
		readonly background_tasks?: readonly BackgroundTaskSummary[] | undefined;
	},
	denied: ReadonlySet<string>,
	interactive: boolean,
): Promise<string | undefined> {
	const reply = e.last_assistant_message ?? "";
	const turn = claimTurn(await $.session.messages(), denied);
	if (reply === "") {
		return undefined;
	}
	const graded: Graded = { turn, reply, tasks: e.background_tasks ?? [] };
	const codes = offeredCodes(turn.looked, turn.failed !== "", interactive);
	// Haiku missed or over-flagged `unseen` on held-out turns, so sonnet grades it, only when a tool ran. Asked for `unseen` alone,
	// sonnet flagged 8 of 39 clean replies; beside the other codes it flagged at most 1 of 39, so it sees them and keeps `unseen`.
	const [found, unseen] = await Promise.all([
		gradeOnce($, graded, { model: "haiku", list: codes, results: [] }),
		turn.results.length > 0
			? gradeOnce($, graded, {
					model: "sonnet",
					list: [...UNSEEN_PEERS, "unseen"],
					results: turn.results,
					keep: ["credited", "unseen"],
				})
			: Promise.resolve([]),
	]);
	found.push(...unseen);
	return found.length > 0 ? VERIFY_BLOCK(found) : undefined;
}
