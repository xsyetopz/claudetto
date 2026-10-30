import type { Arm, Result } from "../round/result.ts";

const FIRED: Record<Arm, number> = { ref: 138_000, alt: 99_000 };

export const result = (over: Partial<Result> = {}): Result => ({
	arm: "ref",
	size: 30_000,
	run: 1,
	cost: 1,
	turns: 10,
	compactions: 1,
	peak: 120_000,
	firstPre: FIRED[over.arm ?? "ref"],
	firstPost: 60_000,
	broken: 0,
	untested: 0,
	skipped: 0,
	rereads: 0,
	redone: 0,
	next: 1,
	firstWrite: 1000,
	shares: [0.9, 0.9],
	invalid: null,
	...over,
});

export const forksOf = (
	arm: Arm,
	n: number,
	over: Partial<Result> = {},
): Result[] =>
	Array.from({ length: n }, (_, i) => result({ arm, run: i + 1, ...over }));
