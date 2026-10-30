import { FORK_NOTES } from "../fixture/fixture.ts";
import { SMOKE_MIN_RUNS } from "../plan/floor.ts";
import { ARMS, type Arm, type Measure, type Result } from "./result.ts";

export interface Verdict {
	winner: "alt" | null;
	reasons: string[];
}

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

export const mean = (xs: number[]): number =>
	xs.length > 0 ? sum(xs) / xs.length : Number.NaN;

export const validAt = (rs: Result[], arm: Arm, size: number): Result[] =>
	rs
		.filter((r) => r.arm === arm && r.size === size && !r.invalid)
		.toSorted((l, r) => l.run - r.run);

export const ranRuns = (
	rs: Result[],
	sizes: number[] = verdictSizes(rs),
): number => {
	const counts = sizes.flatMap((size) =>
		ARMS.map((arm) => validAt(rs, arm, size).length),
	);
	return counts.length > 0 ? Math.min(...counts) : 0;
};

const SAME_POINT_SHARE = 0.05;

const avg = (rs: Result[], arm: Arm, size: number, key: Measure): number =>
	mean(validAt(rs, arm, size).map((r) => r[key]));

const firedAt = (rs: Result[], arm: Arm, size: number): number =>
	mean(
		validAt(rs, arm, size)
			.map((r) => r.firstPre)
			.filter((pre) => Number.isFinite(pre)),
	);

const sharesAt = (rs: Result[], arm: Arm, size: number, i: number): number[] =>
	validAt(rs, arm, size)
		.map((r) => r.shares[i] ?? Number.NaN)
		.filter((s) => Number.isFinite(s));

const share = (rs: Result[], arm: Arm, size: number, i: number): number =>
	mean(sharesAt(rs, arm, size, i));

const writeRate = (rs: Result[], arm: Arm, size: number): number =>
	mean(validAt(rs, arm, size).map((r) => r.firstWrite / r.firstPost));

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
	const ref = firedAt(rs, "ref", size);
	const alt = firedAt(rs, "alt", size);
	const together =
		Math.abs(ref - alt) <= SAME_POINT_SHARE * Math.min(ref, alt)
			? [
					`${at}: both arms compacted at about ${Math.round(Math.min(ref, alt))} tokens, so the threshold did not decide the compaction`,
				]
			: [];
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

export const report = (v: Verdict): string =>
	v.winner ? "alt meets each bar." : `No winner. ${v.reasons.join("; ")}`;
