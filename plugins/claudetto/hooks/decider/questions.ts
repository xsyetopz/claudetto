import type { EngineInterface } from "claude-code";

/** One judgment about the state that has a yes or a no. */
export interface Noul {
	readonly type: "noul";
	readonly instructions: string;
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

/** What the Decider uses of `$`, so a test passes plain functions. */
export interface Host {
	readonly env: Pick<EngineInterface["env"], "get">;
	readonly http: Pick<EngineInterface["http"], "fetch">;
	readonly process: Pick<EngineInterface["process"], "run">;
	readonly clock: Pick<EngineInterface["clock"], "sleep">;
	readonly model: Pick<EngineInterface["model"], "complete">;
	readonly ui: Pick<EngineInterface["ui"], "log">;
}
