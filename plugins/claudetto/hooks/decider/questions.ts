import type { EngineInterface } from "claude-code";

import type { PinConstraint } from "../texts-handoff.ts";

/** One judgment about the state that has a yes or a no. */
export interface Noul {
	readonly type: "noul";
	readonly instructions: string;
	/** What a yes and a no mean. */
	readonly criteria?: { readonly true: string; readonly false: string };
}

/** One judgment that picks the best of the options named by `criteria`; the keys are the option names. */
export interface Choice {
	readonly type: "choice";
	readonly instructions: string;
	readonly criteria: Readonly<Record<string, string>>;
}

/** The questions of one site with the thresholds that turn a probability into an answer. */
export interface QuestionSet {
	/** A Noul at or above this is `yes`. */
	readonly yesMin: number;
	/** A Noul at or below this is `no`; between the two it is `unsettled`. */
	readonly noMax: number;
	/** A Choice whose top option is below this is `unsettled`. */
	readonly pickMin: number;
	/** Send each Noul left between its thresholds to the fallback. */
	readonly escalate?: boolean;
	readonly questions: Readonly<Record<string, Noul | Choice>>;
}

/** The named text a question set reads. */
export type State = Readonly<Record<string, string>>;

/** One answer per question name: `yes`, `no`, or `unsettled` for a Noul, and an option name or `unsettled` for a Choice. */
export type Answers = Readonly<Record<string, string>>;

export const UNSETTLED = "unsettled";

/** The thresholds each site's question set takes. */
export const THRESHOLDS = { yesMin: 0.7, noMax: 0.3, pickMin: 0.75 } as const;

/** The branch gate's one judgment. A yes lets a delete through, so it reads the person's latest word on the branch and counts an instruction only. */
export const BRANCH_GATE: QuestionSet = {
	...THRESHOLDS,
	questions: {
		asks_delete_branch: {
			type: "noul",
			instructions:
				"`person_messages` lists the person's messages, oldest first. Going by the latest message that speaks of deleting the branch named in `branch`, has the person told the assistant to delete that branch?",
			criteria: {
				true: "The latest such message is an instruction to delete this branch, by its name or as one of a group that holds it, such as the other branches or the stale ones.",
				false:
					"No message tells the assistant to delete this branch: the person only asks a question about deleting it, reports a delete already done, quotes someone else, or names other branches. Or a later message keeps the branch or takes the instruction back.",
			},
		},
	},
};

/** The rules a sentence can state and the ledger enforces. */
export const RULE_CRITERIA: Readonly<
	Record<Exclude<PinConstraint["rule"], "none">, string>
> = {
	"read-only":
		"The sentence forbids changing files, so the assistant may only read.",
	"no-commit": "The sentence forbids making a git commit.",
	"no-push": "The sentence forbids pushing to a remote.",
	"only-files":
		"The sentence limits edits to files it names by path; a sentence that names no path does not fit.",
	"no-questions": "The sentence forbids asking the user questions.",
};

const perSentence = (n: number): [string, Noul | Choice][] =>
	Array.from({ length: n }, (_, i): [string, Noul | Choice][] => [
		[
			`restricts_${i + 1}`,
			{
				type: "noul",
				instructions: `Does sentence ${i + 1} in \`sentences\` limit what the assistant may do from now on?`,
			},
		],
		[
			`rule_${i + 1}`,
			{
				type: "choice",
				instructions: `Which enforced rule does sentence ${i + 1} in \`sentences\` state?`,
				criteria: RULE_CRITERIA,
			},
		],
	]).flat();

const perEntry = (n: number): [string, Noul][] =>
	Array.from({ length: n }, (_, j): [string, Noul] => [
		`lifts_${j + 1}`,
		{
			type: "noul",
			instructions: `Does \`message\` allow what entry ${j + 1} in \`entries\` forbids?`,
		},
	]);

/** The constraint ledger's judgments: a `restricts` and a `rule` question per sentence, and a `lifts` question per entry. */
export const ledgerQuestions = (
	sentences: number,
	entries: number,
): QuestionSet => ({
	...THRESHOLDS,
	escalate: true,
	questions: Object.fromEntries([
		...perSentence(sentences),
		...perEntry(entries),
	]),
});

/** What the Decider uses of `$`, so a test passes plain functions. */
export interface Host {
	readonly env: Pick<EngineInterface["env"], "get">;
	readonly http: Pick<EngineInterface["http"], "fetch">;
	readonly process: Pick<EngineInterface["process"], "run">;
	readonly clock: Pick<EngineInterface["clock"], "sleep">;
	readonly model: Pick<EngineInterface["model"], "complete">;
	readonly ui: Pick<EngineInterface["ui"], "log">;
}
