// Whether a fork that came back invalid is worth one more run (spec `compaction-path`, the paid probe).

/**
 * The causes of `problem` that one more run of the same fork can clear.
 *
 * The Claude API documents its transient class as connection errors, 429 and 5xx including 529
 * (<https://platform.claude.com/docs/en/api/errors>), and none of those reaches this harness as a
 * status: a fork is spawned as `claude -p`, so a dropped connection arrives as a non-zero exit or as
 * a stream that stopped before its `result` event. That page also warns that a streamed response can
 * fail after a 200, where "error handling doesn't follow these standard mechanisms", and that case is
 * exactly `no result event`.
 *
 * `error_max_turns` is deliberately absent. A fork that used its turn budget is settled by its own
 * run, so another run of the same fixture spends a whole fork to reach the same place. So is every
 * reading the harness cannot trust, such as a `total_cost_usd` that fell: a second run would pay
 * twice to record one fault of the instrument.
 */
const TRANSIENT = ["no result event", "exit ", "error_during_execution"];

/**
 * Whether the cause `why` is worth running the fork again, once.
 *
 * A cause this does not recognize is not retried. The spare run of each arm already covers a single
 * loss, so the cheap reading is the safe one here: a missed retry costs one run of the spare, while a
 * retry of a settled failure costs a whole fork and records the same cause twice.
 */
export const worthRetry = (why: string): boolean =>
	TRANSIENT.some((cause) => why.includes(cause));
