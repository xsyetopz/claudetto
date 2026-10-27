// The bar of the code-compaction probe (spec `code-compaction`, "Default Path from the Probe" and "No Cache Problem").
// C wins only when it matches or beats B on each quality measure, costs less, and has no cache problem, at each size. Otherwise there is no winner.
// There is also no winner with no results, a size with fewer than `MIN_RUNS` valid runs of B or C, an invalid fork, or a constraint that no check tested.

export type Arm = "B" | "C" | "H";

export const SIZES = [80_000, 200_000];
export const MIN_RUNS = 3;

/** The measures of one fork. */
export interface Result {
	arm: Arm;
	size: number;
	/** The cost of the compaction step and the 2 follow-ups, in the units of `total_cost_usd`. */
	cost: number;
	/** The planted constraints that the files break, 0 to 3. */
	broken: number;
	/** The planted constraints that no check could test, such as the port with no `src/server.ts`. */
	untested: number;
	/** The `Read` calls of files that were already read. */
	rereads: number;
	/** The `Edit` and `Write` calls on files that tasks 1 to 3 changed. */
	redone: number;
	/** 1 when the next task is done after the follow-ups, else 0. */
	next: number;
	/** The `cache_creation_input_tokens` of the first request after the compaction. */
	firstWrite: number;
	/** The cache read share of each follow-up turn. */
	shares: number[];
	/** The cost of the first step apart from the follow-ups: the compaction, or for H the resume turn. */
	compactCost: number;
	/** The time of that step, in ms. */
	compactMs: number;
	/** The context after the compaction (`post_tokens`), or the input sum of the first request after it. */
	context: number;
	/** The cause when a step failed or the totals are wrong, so the fork is out of the means. `null` when valid. */
	invalid: string | null;
}

export interface Verdict {
	winner: "C" | null;
	reasons: string[];
}

/** The keys of `Result` that hold a number. */
type Measure = {
	[K in keyof Result]: Result[K] extends number ? K : never;
}[keyof Result];

const sum = (xs: number[]): number => {
	let total = 0;
	for (const x of xs.values()) {
		total += x;
	}
	return total;
};

const mean = (xs: number[]): number =>
	xs.length > 0 ? sum(xs) / xs.length : Number.NaN;

/** The valid runs of `arm` at `size`. */
const validAt = (rs: Result[], arm: Arm, size: number): Result[] =>
	rs.filter((r) => r.arm === arm && r.size === size && !r.invalid);

/** The mean of `key` over the valid runs of `arm` at `size`. */
const avg = (rs: Result[], arm: Arm, size: number, key: Measure): number =>
	mean(validAt(rs, arm, size).map((r) => r[key]));

/** The mean cache read share of follow-up turn `i` of `arm` at `size`. */
const share = (rs: Result[], arm: Arm, size: number, i: number): number =>
	mean(validAt(rs, arm, size).map((r) => r.shares[i] ?? Number.NaN));

/** The quality bars: a measure of C against the same measure of B, where a NaN fails. */
const BARS: [Measure, (c: number, b: number) => boolean, string][] = [
	["broken", (c, b) => c <= b, "C breaks more constraints"],
	["rereads", (c, b) => c <= b, "C reads more files again"],
	["redone", (c, b) => c <= b, "C does more work again"],
	["next", (c, b) => c >= b, "C does the next task less often"],
	["cost", (c, b) => c < b, "C costs no less"],
];

/** The misses of C at `size`: each quality or cost bar, then the cache problems. */
const missesAt = (rs: Result[], size: number): string[] => {
	const miss = BARS.filter(
		([k, ok]) => !ok(avg(rs, "C", size, k), avg(rs, "B", size, k)),
	).map(([, , why]) => why);
	// Written as a negation, so that a NaN is a miss.
	if (!(avg(rs, "C", size, "firstWrite") <= avg(rs, "B", size, "firstWrite"))) {
		miss.push("cache problem, C writes more cache after the compaction");
	}
	for (const i of [0, 1]) {
		if (!(share(rs, "C", size, i) >= share(rs, "B", size, i))) {
			miss.push(`cache problem, C reads a lower share in follow-up ${i + 1}`);
		}
	}
	return miss.map((m) => `${size / 1000}k: ${m}`);
};

/** The reasons at `size` that stop a verdict: too few valid runs of B or C, and a constraint that no check tested. */
const gapsAt = (rs: Result[], size: number): string[] => [
	...(["B", "C"] as const).flatMap((arm) => {
		const n = validAt(rs, arm, size).length;
		return n < MIN_RUNS
			? [`${size / 1000}k: ${arm} has ${n} valid runs, needs ${MIN_RUNS}`]
			: [];
	}),
	...(["B", "C", "H"] as const).flatMap((arm) => {
		const n = sum(validAt(rs, arm, size).map((r) => r.untested));
		return n
			? [`${size / 1000}k: ${arm} left ${n} constraint checks untested`]
			: [];
	}),
];

/** The verdict of the runs `rs` at `sizes`: `C` when it meets each bar at each size, else no winner and the reason of each miss. */
export const verdict = (rs: Result[], sizes = SIZES): Verdict => {
	const reasons = [
		...rs
			.filter((r) => r.invalid)
			.map((r) => `invalid fork ${r.arm} ${r.size / 1000}k: ${r.invalid}`),
		...sizes.flatMap((size) => {
			const gaps = gapsAt(rs, size);
			return gaps.length > 0 ? gaps : missesAt(rs, size);
		}),
	];
	return reasons.length > 0
		? { winner: null, reasons }
		: { winner: "C", reasons };
};

/** The report line of a verdict. */
export const report = (v: Verdict): string =>
	v.winner ? "C meets each bar." : `No winner. ${v.reasons.join("; ")}`;
