import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { forksOf, result } from "../../__tests__/stub.ts";
import { FORK_NOTES } from "../../fixture/fixture.ts";
import { BARS, ranRuns, verdict } from "../verdict.ts";

const SIZE = 30_000;

const PAGE = "docs/evidence/code-compaction-probe.md";

const CACHE_MEASURES: readonly string[] = ["firstWrite", "shares[0]"];

const barRows = async (): Promise<string[]> => {
	const page = await readFile(PAGE, "utf8");
	const section =
		page.split("\n## ").find((part) => part.startsWith("The Bars")) ?? "";
	return section
		.split("\n")
		.filter((line) => line.startsWith("| ") && !line.startsWith("| ---"))
		.slice(1);
};

const cheaper = (alt: Parameters<typeof forksOf>[2] = {}) => [
	...forksOf("ref", 10),
	...forksOf("alt", 10, { cost: 0.8, ...alt }),
];

describe("verdict", () => {
	test("the alternative wins when it is cheaper and no bar is worse", () => {
		const rs = cheaper();

		const v = verdict(rs, [SIZE]);

		expect(v.winner).toBe("alt");
		expect(v.reasons).toEqual([]);
	});

	test("an alternative that costs the same does not win", () => {
		const rs = cheaper({ cost: 1 });

		expect(verdict(rs, [SIZE]).winner).toBeNull();
	});

	test("cheaper but reading more files again does not win", () => {
		const rs = cheaper({ rereads: 1 });

		expect(verdict(rs, [SIZE]).winner).toBeNull();
	});

	test("cheaper but breaking a constraint does not win", () => {
		expect(verdict(cheaper({ broken: 1 }), [SIZE]).winner).toBeNull();
	});

	test("cheaper but redoing work does not win", () => {
		expect(verdict(cheaper({ redone: 1 }), [SIZE]).winner).toBeNull();
	});

	test("cheaper but needing more turns to completion does not win", () => {
		expect(verdict(cheaper({ turns: 11 }), [SIZE]).winner).toBeNull();
	});

	test("cheaper but finishing the next task less often does not win", () => {
		expect(verdict(cheaper({ next: 0 }), [SIZE]).winner).toBeNull();
	});

	test("a larger first cache write is a cache problem", () => {
		expect(verdict(cheaper({ firstWrite: 5000 }), [SIZE]).winner).toBeNull();
	});

	test("a lower read share in the second follow-up is a cache problem", () => {
		const rs = cheaper({ shares: [0.9, 0.5] });

		expect(verdict(rs, [SIZE]).winner).toBeNull();
	});

	test("both arms at 0 on the next task is a gap and not a pass", () => {
		const rs = [
			...forksOf("ref", 10, { next: 0 }),
			...forksOf("alt", 10, { next: 0, cost: 0.8 }),
		];

		const v = verdict(rs, [SIZE]);

		expect(v.winner).toBeNull();
		expect(v.reasons.length).toBeGreaterThan(0);
	});

	test("an arm where one fork did not compact is a gap, not a cache problem", () => {
		const rs = [
			...forksOf("ref", 1),
			...forksOf("ref", 2, {
				compactions: 0,
				firstWrite: Number.NaN,
				firstPre: Number.NaN,
				shares: [],
			}),
			...forksOf("alt", 3, { cost: 0.5 }),
		];

		const v = verdict(rs, [SIZE]);

		expect(v.winner).toBeNull();
		expect(v.reasons.some((r) => r.includes("did not compact"))).toBe(true);
		expect(v.reasons.some((r) => r.includes("cache problem"))).toBe(false);
	});

	test("a fork that compacted but saved no follow-up share is a gap, not a cache problem", () => {
		const rs = [
			...forksOf("ref", 2, { shares: [0.92, 0.96] }),
			result({ arm: "ref", run: 3, shares: [] }),
			...forksOf("alt", 3, { cost: 0.5, shares: [0.94, 0.98] }),
		];

		const v = verdict(rs, [SIZE]);

		expect(v.winner).toBeNull();
		expect(v.reasons.some((r) => r.includes("cache problem"))).toBe(false);
		expect(v.reasons.some((r) => r.includes("follow-up 1"))).toBe(true);
	});

	test("the share bar reads the forks that saved a share when the floor is met", () => {
		const rs = [
			...forksOf("ref", 3, { shares: [0.92, 0.96] }),
			result({ arm: "ref", run: 4, shares: [] }),
			...forksOf("alt", 4, { cost: 0.5, shares: [0.94, 0.98] }),
		];

		expect(verdict(rs, [SIZE]).winner).toBe("alt");
	});

	test("writing more cache in total but no more per kept token is no cache problem", () => {
		const rs = [
			...forksOf("ref", 3, { firstWrite: 10_687, firstPost: 5980 }),
			...forksOf("alt", 3, {
				cost: 0.5,
				firstWrite: 20_000,
				firstPost: 11_438,
			}),
		];

		expect(verdict(rs, [SIZE]).winner).toBe("alt");
	});

	test("writing more cache per kept token is a cache problem", () => {
		const rs = [
			...forksOf("ref", 3, { firstWrite: 10_687, firstPost: 5980 }),
			...forksOf("alt", 3, {
				cost: 0.5,
				firstWrite: 21_196,
				firstPost: 11_438,
			}),
		];

		const v = verdict(rs, [SIZE]);

		expect(v.winner).toBeNull();
		expect(v.reasons.some((r) => r.includes("per token"))).toBe(true);
	});

	test("no fork that compacted is a gap and not a pass", () => {
		const rs = [
			...forksOf("ref", 10, { compactions: 0 }),
			...forksOf("alt", 10, { compactions: 0, cost: 0.8 }),
		];

		expect(verdict(rs, [SIZE]).winner).toBeNull();
	});

	test("the gap of no compaction names the highest context a fork reached", () => {
		const rs = [
			...forksOf("ref", 10, { compactions: 0, peak: 70_000 }),
			...forksOf("alt", 10, { compactions: 0, cost: 0.8, peak: 81_234 }),
		];

		const v = verdict(rs, [SIZE]);

		expect(v.reasons.some((r) => r.includes("81234"))).toBe(true);
	});

	test("both arms compacting at the same context is a gap and not a pass", () => {
		const rs = [
			...forksOf("ref", 10, { firstPre: 176_600 }),
			...forksOf("alt", 10, { firstPre: 176_580, cost: 0.8 }),
		];

		const v = verdict(rs, [SIZE]);

		expect(v.winner).toBeNull();
		expect(v.reasons.some((r) => r.includes("176580"))).toBe(true);
	});

	test("arms that compacted far apart leave no same-point gap", () => {
		const rs = [
			...forksOf("ref", 10, { firstPre: 141_000 }),
			...forksOf("alt", 10, { firstPre: 101_000, cost: 0.8 }),
		];

		expect(verdict(rs, [SIZE]).winner).toBe("alt");
	});

	test("a round that saved no compaction point claims no same-point gap", () => {
		const rs = [
			...forksOf("ref", 10, { firstPre: Number.NaN }),
			...forksOf("alt", 10, { firstPre: Number.NaN, cost: 0.8 }),
		];

		expect(verdict(rs, [SIZE]).winner).toBe("alt");
	});

	test("one arm that never compacted leaves the other arm's point readable", () => {
		const rs = [
			...forksOf("ref", 9, { firstPre: 176_600 }),
			result({ arm: "ref", run: 10, compactions: 0, firstPre: Number.NaN }),
			...forksOf("alt", 10, { firstPre: 176_600, cost: 0.8 }),
		];

		expect(verdict(rs, [SIZE]).winner).toBeNull();
	});

	test("fewer valid forks than the smoke floor gives no winner", () => {
		const rs = [...forksOf("ref", 2), ...forksOf("alt", 2, { cost: 0.8 })];

		expect(verdict(rs, [SIZE]).winner).toBeNull();
	});

	test("an invalid fork is named and gives no winner", () => {
		const rs = [...cheaper(), ...forksOf("alt", 1, { invalid: "exit 1" })];

		const v = verdict(rs, [SIZE]);

		expect(v.winner).toBeNull();
		expect(v.reasons.some((r) => r.includes("exit 1"))).toBe(true);
	});

	test("a constraint that no check tested gives no winner", () => {
		expect(verdict(cheaper({ untested: 1 }), [SIZE]).winner).toBeNull();
	});

	test("cheaper but skipping more note tasks does not win", () => {
		expect(verdict(cheaper({ skipped: 1 }), [SIZE]).winner).toBeNull();
	});

	test("both arms skipping every note task is a gap and not a pass", () => {
		const rs = [
			...forksOf("ref", 10, { skipped: FORK_NOTES }),
			...forksOf("alt", 10, { skipped: FORK_NOTES, cost: 0.8 }),
		];

		const v = verdict(rs, [SIZE]);

		// A fork that ticks every box without doing the work would otherwise score as a finished one.
		expect(v.winner).toBeNull();
		expect(v.reasons.some((r) => r.includes("note task"))).toBe(true);
	});

	test("no results give no winner", () => {
		expect(verdict([], [SIZE]).winner).toBeNull();
	});

	test("a size where the alternative loses stops the win at the other size", () => {
		const other = 60_000;
		const rs = [
			...cheaper(),
			...forksOf("ref", 10, { size: other }),
			...forksOf("alt", 10, { size: other, cost: 1.2 }),
		];

		expect(verdict(rs, [SIZE, other]).winner).toBeNull();
	});
});

describe("ranRuns", () => {
	test("is the count of each arm when both arms ran the same number", () => {
		expect(ranRuns(cheaper(), [SIZE])).toBe(10);
	});

	test("is the count of the thinnest arm when a cap cut one short", () => {
		const rs = [...forksOf("ref", 10), ...forksOf("alt", 9, { cost: 0.8 })];

		expect(ranRuns(rs, [SIZE])).toBe(9);
	});

	test("counts no invalid fork", () => {
		const rs = [
			...forksOf("ref", 10),
			...forksOf("alt", 9, { cost: 0.8 }),
			result({ arm: "alt", run: 10, invalid: "threw: step 1 failed" }),
		];

		expect(ranRuns(rs, [SIZE])).toBe(9);
	});

	test("is zero for a size that no fork reached", () => {
		expect(ranRuns(cheaper(), [SIZE, 60_000])).toBe(0);
	});

	test("is zero when no fork ran at all", () => {
		expect(ranRuns([], [SIZE])).toBe(0);
	});
});

describe("the bars against the page that defines them", () => {
	test("every bar the verdict scores has a row on the page", async () => {
		const rows = await barRows();

		for (const [measure] of BARS) {
			expect(rows.filter((row) => row.includes(`\`${measure}\``))).toHaveLength(
				1,
			);
		}
	});

	test("the page lists the bars of the verdict and the two cache bars, and no other", async () => {
		const rows = await barRows();

		for (const measure of CACHE_MEASURES) {
			expect(rows.filter((row) => row.includes(`\`${measure}\``))).toHaveLength(
				1,
			);
		}
		expect(rows).toHaveLength(BARS.length + CACHE_MEASURES.length);
	});
});
