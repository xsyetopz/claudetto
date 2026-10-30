// The decision rule of the `compaction-path` spec, "Decision Rule": the alternative wins only on a lower mean cost
// per fork than the reference at each size, no worse result on each bar, and no cache problem.
// The bars are defined in `docs/evidence/code-compaction-probe.md`, section "The Bars". `BARS` below is
// transcribed from that table, row for row, and nothing reads the Markdown at run time: a probe round must
// decide with no `docs/` read, and a table a program parses is a table a person stops editing.
// So the page is the definition and this file is the copy, and the two drifted once: `skipped` and `turns`
// were bars here and absent from the table until 2026-10-30, when both rows were added to the page.
// A bar that tests nothing is a gap and not a pass.

import { FORK_NOTES } from "../fixture/fixture.ts";
import { SMOKE_MIN_RUNS } from "../plan/floor.ts";
import { ARMS, type Arm, type Measure, type Result } from "./result.ts";

/** The outcome of the decision rule: `winner` is `alt` only when every bar holds, and `reasons` lists why it is not. */
export interface Verdict {
	winner: "alt" | null;
	reasons: string[];
}

/** The sizes that `rs` holds a fork of, in the order they first appear. */
export const verdictSizes = (rs: Result[]): number[] => [
	...new Set(rs.map((r) => r.size)),
];

const sum = (xs: number[]): number => {
	let total = 0;
	for (const x of xs.values()) {
		total += x;
	}
	return total;
};

/** The arithmetic mean of `xs`, or NaN for an empty list. */
export const mean = (xs: number[]): number =>
	xs.length > 0 ? sum(xs) / xs.length : Number.NaN;

/** The valid forks of `arm` at `size`, in run order. */
export const validAt = (rs: Result[], arm: Arm, size: number): Result[] =>
	rs
		.filter((r) => r.arm === arm && r.size === size && !r.invalid)
		.toSorted((l, r) => l.run - r.run);

/**
 * The valid forks that the thinnest arm of `sizes` finished, which is the run count a document may cite.
 * A size that no fork reached counts 0, because a round that skipped a size did not run it thinly, it
 * did not run it at all.
 */
export const ranRuns = (
	rs: Result[],
	sizes: number[] = verdictSizes(rs),
): number => {
	const counts = sizes.flatMap((size) =>
		ARMS.map((arm) => validAt(rs, arm, size).length),
	);
	return counts.length > 0 ? Math.min(...counts) : 0;
};

/**
 * How close the two arms' compaction points may sit before the round compared nothing, as a share of the
 * lower one. The thresholds of a round differ by far more than this, 140,000 against the 100,000 of the
 * round of 2026-10-29, so arms that fired this near each other did not separate.
 */
const SAME_POINT_SHARE = 0.05;

const avg = (rs: Result[], arm: Arm, size: number, key: Measure): number =>
	mean(validAt(rs, arm, size).map((r) => r[key]));

/**
 * The mean context that the forks of `arm` which compacted fired their first compaction at. Only those
 * forks, because a fork that did not compact has no point and would make the mean of the arm unreadable.
 * NaN when no fork of the arm compacted, or when the round saved no compaction point.
 */
const firedAt = (rs: Result[], arm: Arm, size: number): number =>
	mean(
		validAt(rs, arm, size)
			.map((r) => r.firstPre)
			.filter((pre) => Number.isFinite(pre)),
	);

/** The read shares of follow-up `i` that the forks of `arm` saved. A fork that saved none is left out. */
const sharesAt = (rs: Result[], arm: Arm, size: number, i: number): number[] =>
	validAt(rs, arm, size)
		.map((r) => r.shares[i] ?? Number.NaN)
		.filter((s) => Number.isFinite(s));

/**
 * The mean read share of follow-up `i` over the forks of `arm` that saved one. Only those forks, for the
 * reason `firedAt` filters too: a fork whose compaction fires near the end of its last step leaves one
 * request after the boundary, so `measure` finds no follow-up to read and `shares` comes back short.
 * Taken into the mean as a NaN, that one fork made the whole arm unreadable, and because the bars are
 * written as negations it was reported as a problem of `alt`. `gapsAt` counts the forks that saved a
 * share, so a bar this thin is named as a gap before any arm is blamed for it.
 */
const share = (rs: Result[], arm: Arm, size: number, i: number): number =>
	mean(sharesAt(rs, arm, size, i));

/**
 * The cache an arm wrote after its first compaction, per token of context that compaction left. The
 * absolute count is not comparable between arms, because the threshold sets how much context the
 * compaction leaves and the write scales with it almost exactly: over the smoke round of 2026-10-30 the
 * six forks wrote between 1.740 and 1.856 tokens per token kept, while `ref` left a mean of 5,980 tokens
 * and `alt` 11,438. So the absolute bar reads `alt` 98.3% above `ref` and the rate reads it 3.6% above.
 * The first figure is the arms' two summaries differing in length, which is not what this bar is for.
 */
const writeRate = (rs: Result[], arm: Arm, size: number): number =>
	mean(validAt(rs, arm, size).map((r) => r.firstWrite / r.firstPost));

/** The bars: a measure of `alt` against the same measure of `ref`, where a NaN fails. Exported so that one test can hold this list against the table of the page it is transcribed from. */
export const BARS: [Measure, (alt: number, ref: number) => boolean, string][] =
	[
		["broken", (a, r) => a <= r, "alt breaks more constraints"],
		["skipped", (a, r) => a <= r, "alt skips more note tasks"],
		["rereads", (a, r) => a <= r, "alt reads more files again"],
		["redone", (a, r) => a <= r, "alt does more work again"],
		["next", (a, r) => a >= r, "alt does the next task less often"],
		["turns", (a, r) => a <= r, "alt needs more turns to completion"],
		["cost", (a, r) => a < r, "alt costs no less per fork"],
	];

/** The misses of `alt` at `size`: each bar, then the cache problems. */
const missesAt = (rs: Result[], size: number): string[] => {
	const miss = BARS.filter(
		([k, ok]) => !ok(avg(rs, "alt", size, k), avg(rs, "ref", size, k)),
	).map(([, , why]) => why);
	// Written as a negation, so that a NaN is a miss.
	if (!(writeRate(rs, "alt", size) <= writeRate(rs, "ref", size))) {
		miss.push(
			"cache problem, alt writes more cache per token of context its compaction left",
		);
	}
	for (const i of [0, 1]) {
		if (!(share(rs, "alt", size, i) >= share(rs, "ref", size, i))) {
			miss.push(`cache problem, alt reads a lower share in follow-up ${i + 1}`);
		}
	}
	return miss.map((m) => `${size / 1000}k: ${m}`);
};

/** The reasons at `size` that stop a verdict before the bars are read. */
const gapsAt = (rs: Result[], size: number): string[] => {
	const at = `${size / 1000}k`;
	const few = (["ref", "alt"] as const).flatMap((arm) => {
		const n = validAt(rs, arm, size).length;
		return n < SMOKE_MIN_RUNS
			? [`${at}: ${arm} has ${n} valid runs, needs ${SMOKE_MIN_RUNS}`]
			: [];
	});
	const idle =
		avg(rs, "ref", size, "next") === 0 && avg(rs, "alt", size, "next") === 0
			? [`${at}: no fork finished the task, so the \`next\` bar tests nothing`]
			: [];
	// A fork that did not compact tests no threshold, and it has no post-compaction cache figures either,
	// so an arm that holds one cannot be read on any bar of this probe. Read as zeros instead, the two
	// `ref` forks of the 2026-10-29 smoke round that finished without compacting turned into three cache
	// problems against `alt`. The highest context such a fork reached is named, because it says whether to
	// raise the base size or lengthen the task.
	const still = (["ref", "alt"] as const).flatMap((arm) => {
		const forks = validAt(rs, arm, size);
		const none = forks.filter((r) => r.compactions === 0);
		const high = Math.max(0, ...none.map((r) => r.peak));
		return none.length > 0
			? [
					`${at}: ${arm} has ${none.length} of ${forks.length} forks that did not compact, so the threshold and the cache bars test nothing (peak context ${high} tokens)`,
				]
			: [];
	});
	// A follow-up that too few forks of an arm saved a read share for is a bar below the floor the rest of
	// the round is held to, and it is read against the same floor. Round 8 of
	// `docs/evidence/code-compaction-probe.md:414` is the standing case: no fork of arm H measured the
	// second follow-up in either of two rounds, which that page records as a comparison no round has made.
	const thin = [0, 1].flatMap((i) =>
		(["ref", "alt"] as const).flatMap((arm) => {
			const saved = sharesAt(rs, arm, size, i).length;
			return validAt(rs, arm, size).length > 0 && saved < SMOKE_MIN_RUNS
				? [
						`${at}: ${arm} saved a read share for follow-up ${i + 1} in ${saved} forks, needs ${SMOKE_MIN_RUNS}, so that bar tests nothing`,
					]
				: [];
		}),
	);
	// Two arms that compacted at the same context compared nothing: one turn carried the context past both
	// thresholds before the next check, so each bar reads the fixture and not the threshold. The round of
	// 2026-10-29 fired every fork of both arms at 176,600 tokens, because its prompt read 15 notes in one
	// batch. A round that saved no compaction point reads NaN here and claims nothing either way.
	const ref = firedAt(rs, "ref", size);
	const alt = firedAt(rs, "alt", size);
	const together =
		Math.abs(ref - alt) <= SAME_POINT_SHARE * Math.min(ref, alt)
			? [
					`${at}: both arms compacted at about ${Math.round(Math.min(ref, alt))} tokens, so the threshold did not decide the compaction`,
				]
			: [];
	// A tick is no evidence that the work was done, so a round where no fork wrote a single note module
	// measures the ticking and not the threshold.
	const ticked =
		avg(rs, "ref", size, "skipped") === FORK_NOTES &&
		avg(rs, "alt", size, "skipped") === FORK_NOTES
			? [
					`${at}: no fork did a note task, so every bar reads ticks and not work`,
				]
			: [];
	const untested = (["ref", "alt"] as const).flatMap((arm) => {
		const n = sum(validAt(rs, arm, size).map((r) => r.untested));
		return n ? [`${at}: ${arm} left ${n} constraint checks untested`] : [];
	});
	return [
		...few,
		...idle,
		...still,
		...thin,
		...together,
		...ticked,
		...untested,
	];
};

/** The verdict of the runs `rs` at `sizes`: `alt` when it meets each bar at each size, else no winner and the reason of each miss. */
export const verdict = (
	rs: Result[],
	sizes: number[] = verdictSizes(rs),
): Verdict => {
	const reasons = [
		...rs
			.filter((r) => r.invalid)
			.map(
				(r) =>
					`invalid fork ${r.arm} ${r.size / 1000}k run ${r.run}: ${r.invalid}`,
			),
		...(sizes.length === 0 ? ["no results"] : []),
		...sizes.flatMap((size) => {
			const gaps = gapsAt(rs, size);
			return gaps.length > 0 ? gaps : missesAt(rs, size);
		}),
	];
	return reasons.length > 0
		? { winner: null, reasons }
		: { winner: "alt", reasons };
};

/** The one line a verdict prints: `alt meets each bar.` for a winner, else `No winner.` and the reasons joined with `; `. */
export const report = (v: Verdict): string =>
	v.winner ? "alt meets each bar." : `No winner. ${v.reasons.join("; ")}`;
