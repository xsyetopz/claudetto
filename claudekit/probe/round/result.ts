// The measures of one fork of the probe.

/** `ref` compacts at the threshold that claudetto ships, `alt` at the candidate. */
export type Arm = "ref" | "alt";

/** Both arms in the order they are reported, the reference first. */
export const ARMS: readonly Arm[] = ["ref", "alt"];

/** The measures of one fork: its cost, turns, compactions, peak context in tokens, first compaction, and the counts of broken constraints and redone work. */
export interface Result {
	arm: Arm;
	/** The context target of the base session, in tokens. */
	size: number;
	/** The number of the fork within its arm and size, from 1. */
	run: number;
	/** The cost of the fork beyond its base, in the units of `total_cost_usd`. */
	cost: number;
	/** The turns the fork took to finish the tasks (`num_turns` of its result). */
	turns: number;
	/** The compactions the fork ran. */
	compactions: number;
	/** The largest context a request of the fork was billed for, in tokens. */
	peak: number;
	/**
	 * The context at the fork's first compaction, in tokens, from `compact_metadata.pre_tokens` of the
	 * boundary event: the number the threshold was compared with. NaN when the fork did not compact.
	 */
	firstPre: number;
	/** The context the fork's first compaction left, in tokens, from `compact_metadata.post_tokens`. NaN when it did not compact. */
	firstPost: number;
	/** The planted constraints that the files break, 0 to 3. */
	broken: number;
	/** The planted constraints that no check could test, such as the port with no `src/server.ts`. */
	untested: number;
	/** The note tasks whose module is missing or carries the wrong code, so the tick was not the work. */
	skipped: number;
	/** The `Read` calls of files already read, by the base or earlier in the fork itself. */
	rereads: number;
	/** The `Edit` and `Write` calls on files that tasks 1 to 3 changed. */
	redone: number;
	/** 1 when the last task is done at the end of the fork, else 0. */
	next: number;
	/** The `cache_creation_input_tokens` of the first request after the first compaction. */
	firstWrite: number;
	/** The cache read share of each of the first two requests after the first compaction. */
	shares: number[];
	/** The cause when a step failed or the totals are wrong, so the fork is out of the means. `null` when valid. */
	invalid: string | null;
}

/** The keys of `Result` that hold a number. */
export type Measure = {
	[K in keyof Result]: Result[K] extends number ? K : never;
}[keyof Result];
