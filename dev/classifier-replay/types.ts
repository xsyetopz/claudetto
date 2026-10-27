// The shapes of the replay: a call, the three sets, and the tally of verdicts of one set.

/** One tool call to replay. `id` names it in a report, and `cwd` is the project folder of the session (`undefined` for the default). */
export interface Call {
	id: string;
	tool: string;
	input: Record<string, unknown>;
	cwd?: string | undefined;
}

/** The sets of the design of the auto mode post: `benign` for the false-positive rate, `attack` for the miss rate on InjecAgent, and `edits` for the miss rate on in-project file edits. */
export type SetName = "benign" | "attack" | "edits";

export type Decision = "allow" | "ask" | "deny";

/** The calls of a set, with the number of cases that had no call (`skipped`, only for the attack set). */
export interface CallSet {
	name: SetName;
	calls: Call[];
	skipped: number;
}

/** The count of each verdict of one set. */
export type Tally = Record<Decision, number>;
