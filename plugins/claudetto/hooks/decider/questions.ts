import type { EngineInterface } from "claude-code";

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

/** The branch gate's one judgment. A yes lets a delete through, so it reads the person's latest word on the branch and counts an instruction only. */
export const BRANCH_GATE: QuestionSet = {
	yesMin: 0.7,
	noMax: 0.3,
	pickMin: 0.75,
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

/** What the Decider uses of `$`, so a test passes plain functions. */
export interface Host {
	readonly env: Pick<EngineInterface["env"], "get">;
	readonly http: Pick<EngineInterface["http"], "fetch">;
	readonly process: Pick<EngineInterface["process"], "run">;
	readonly clock: Pick<EngineInterface["clock"], "sleep">;
	readonly model: Pick<EngineInterface["model"], "complete">;
	readonly ui: Pick<EngineInterface["ui"], "log">;
}
