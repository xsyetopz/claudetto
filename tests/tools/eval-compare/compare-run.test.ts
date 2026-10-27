// `dev/eval-compare/`: the two runs of `runBoth`, with a fake process runner and a fake output.

import { expect, test } from "bun:test";
import { write } from "bun";
import { runBoth as runBothOn } from "../../../dev/eval-compare/adapters/eval-both.ts";
import {
	armProblem,
	baselineProblem,
	modelOf,
	withCostBound,
} from "../../../dev/eval-compare/compare.ts";
import { defined } from "../helpers.ts";

const A_RE = /\bA\b/;
const B_SONNET_RE = /\bB\b[^\n]*\bsonnet\b/;
const PLUGINS_RE = /"plugins":\[[^\]]*\]/;
const B_RE = /\bB\b/;
const N_10_RE = /\b10\b/;
const B_3_RE = /\bB\b[^\n]*\b3\b/;

const runBoth = runBothOn;

/** A valid result document: one case with a score, and the plugin at `plugin` that loaded under `model`. */
const good = (plugin = "/p", model?: string): string =>
	JSON.stringify({
		schemaVersion: 1,
		partial: false,
		suite: {
			plugins: [{ name: "p", path: plugin }],
			...(model === undefined ? {} : { modelOverride: model }),
		},
		cases: [{ runsPerCase: 10, aggregates: { score: 1, scoreWithout: 0.5 } }],
	});

/** A result document for the plugin of the call that reads it. */
const GOOD = (plugin: string): string => good(plugin);

/** The last logged line, which is the verdict of `runBoth`: the headings of the arms come before it. */
const verdictLine = (lines: string[]): string => lines.at(-1) ?? "";

/**
 * A fake runner that gives each call the next status and records the folders and the arguments.
 * It writes `docs[n]` to the `--json` file of call `n` (`GOOD` by default), and writes nothing for `null`.
 */
const fake = (
	statuses: (number | undefined)[],
	docs: (string | ((plugin: string) => string) | null)[] = [],
) => {
	const calls: string[] = [];
	const argvs: string[][] = [];
	const lines: string[] = [];
	return {
		calls,
		argvs,
		lines,
		spawn: async (_cmd: string, args: string[]) => {
			calls.push(defined(args[2]));
			argvs.push(args);
			const plugin = defined(args[2]);
			const given = docs[calls.length - 1];
			const doc =
				typeof given === "function"
					? given(plugin)
					: (given ?? (calls.length <= docs.length ? null : good(plugin)));
			if (doc !== null) {
				await write(defined(args[args.indexOf("--json") + 1]), doc);
			}
			// A fake result with only `exitCode`, which `runBoth` reads.
			return { exitCode: statuses[calls.length - 1] };
		},
		log: (line: string) => lines.push(line),
	};
};

test("two good runs return 0 and point to the comparison of the tables", async () => {
	const f = fake([0, 0]);
	expect(await runBoth("a", "b", [], f.spawn, f.log)).toBe(0);
	expect(f.calls.length).toBe(2);
});

test("a failed run returns 1, names the arm and the exit code, and gives no comparison", async () => {
	const f = fake([0, 3]);
	expect(await runBoth("a", "b", [], f.spawn, f.log)).toBe(1);
	const out = verdictLine(f.lines);
	expect(out).toMatch(B_3_RE);
	expect(out).not.toMatch(A_RE);
	expect(out).not.toMatch(N_10_RE);
});

test("a run with no status counts as a failure, and the second arm still runs", async () => {
	const f = fake([undefined, 0]);
	expect(await runBoth("a", "b", [], f.spawn, f.log)).toBe(1);
	expect(f.calls.length).toBe(2);
});

test("the runs grant no scaffold and no tools unless the options add them", async () => {
	const f = fake([0, 0]);
	await runBoth("a", "b", [], f.spawn, f.log);
	for (const argv of f.argvs) {
		expect(!argv.includes("--scaffold")).toBeTruthy();
		expect(!argv.includes("--allow-tools")).toBeTruthy();
	}
	const g = fake([0, 0]);
	await runBoth("a", "b", ["--allow-tools", "Bash"], g.spawn, g.log);
	for (const argv of g.argvs) {
		expect(argv.includes("--allow-tools")).toBeTruthy();
	}
});

test("the cost bound is added only when the options set none, in either form", async () => {
	expect(withCostBound([])).toStrictEqual(["--max-cost-usd", "5"]);
	expect(withCostBound(["--max-cost-usd", "20"])).toStrictEqual([
		"--max-cost-usd",
		"20",
	]);
	expect(withCostBound(["--max-cost-usd=20"])).toStrictEqual([
		"--max-cost-usd=20",
	]);
});

/** Runs both arms on `results`, and gives the exit code and the verdict. */
const runWith = async (results: Parameters<typeof fake>[1]) => {
	const f = fake([0, 0], results);
	const code = await runBoth("a", "b", [], f.spawn, f.log);
	return { code, out: verdictLine(f.lines) };
};

/** The ways that the verdict `out` does not name only arm B, as a list that is empty when it does. */
const notOnlyB = (out: string): string[] => [
	// The verdict comes after the heading of arm B, so a run with no verdict ends on that heading.
	...(out.includes("== Arm") ? ["the verdict ends on an arm heading"] : []),
	...(B_RE.test(out) ? [] : ["the verdict does not name arm B"]),
	...(A_RE.test(out) ? ["the verdict names arm A"] : []),
	...(N_10_RE.test(out) ? ["the verdict names the score 10"] : []),
];

test("an arm that exits with 0 and wrote no result fails the comparison and names the arm", async () => {
	const { code, out } = await runWith([GOOD, null]);
	expect(code).toBe(1);
	expect(notOnlyB(out)).toStrictEqual([]);
});

test("an arm with no case rows fails the comparison, also when the run exits with 0", async () => {
	const empty = JSON.stringify({ partial: false, cases: [] });
	const f = fake([0, 0], [empty, GOOD]);
	expect(await runBoth("a", "b", [], f.spawn, f.log)).toBe(1);
	const out = verdictLine(f.lines);
	expect(out).toMatch(A_RE);
	expect(out).not.toMatch(B_RE);
});

test("`--json` is the last argument of a run, because it takes the words after it", async () => {
	const f = fake([0, 0]);
	await runBoth("a", "b", ["--runs", "1"], f.spawn, f.log);
	for (const argv of f.argvs) {
		expect(argv.at(-2)).toBe("--json");
	}
});

test("`armProblem` gives a separate problem for each way that a result is not valid", async () => {
	const doc = (x: object) =>
		JSON.stringify({ cases: [{ aggregates: { score: 1 } }], ...x });
	expect(armProblem(GOOD("/p"))).toBe(null);
	const problems = [
		armProblem("not json"),
		armProblem("null"),
		armProblem(JSON.stringify({ cases: [{ aggregates: {} }] })),
		armProblem(doc({ partial: true })),
		armProblem(doc({ suite: { plugins: [] } })),
		armProblem(
			doc({ suite: { plugins: [{ name: "p", problem: "will_not_load" }] } }),
		),
	];
	expect(problems.every((p) => typeof p === "string" && p !== "")).toBe(true);
	expect(new Set(problems).size).toBe(problems.length);
	// A problem that says nothing about loading does not block.
	expect(
		armProblem(
			doc({
				suite: { plugins: [{ name: "p", problem: "identity_unverified" }] },
			}),
		),
	).toBe(null);
});

test("a baseline at the maximum on each case fails the comparison and names the arm", async () => {
	const ceiling = JSON.stringify({
		cases: [{ aggregates: { score: 1, scoreWithout: 1 } }],
	});
	const { code, out } = await runWith([GOOD, ceiling]);
	expect(code).toBe(1);
	expect(notOnlyB(out)).toStrictEqual([]);
});

test("`baselineProblem` accepts one case below the maximum and names a missing score", () => {
	const doc = (...without: (number | undefined)[]) =>
		JSON.stringify({
			cases: without.map((w) => ({
				aggregates: { score: 1, scoreWithout: w },
			})),
		});
	expect(baselineProblem(doc(1, 0.67))).toBe(null);
	const atMaximum = baselineProblem(doc(1, 1));
	const noScore = baselineProblem(doc(0.5, undefined));
	expect(typeof atMaximum).toBe("string");
	expect(typeof noScore).toBe("string");
	expect(atMaximum).not.toBe(noScore);
	expect(baselineProblem(null)).toBe(null);
});

test("an arm that loaded no plugin fails the comparison and names the arm", async () => {
	const { code, out } = await runWith([
		GOOD,
		() => good("/p").replace(PLUGINS_RE, '"plugins":[]'),
	]);
	expect(code).toBe(1);
	expect(notOnlyB(out)).toStrictEqual([]);
});

test("an arm that loaded another plugin than the one it names fails the comparison", async () => {
	const { code, out } = await runWith([GOOD, () => good("/elsewhere")]);
	expect(code).toBe(1);
	expect(notOnlyB(out)).toStrictEqual([]);
});

test("an arm that served another model than `--model` fails the comparison", async () => {
	const f = fake([0, 0], [(p) => good(p, "haiku"), (p) => good(p, "sonnet")]);
	expect(await runBoth("a", "b", ["--model", "haiku"], f.spawn, f.log)).toBe(1);
	const out = verdictLine(f.lines);
	expect(out).toMatch(B_SONNET_RE);
	expect(out).not.toMatch(A_RE);
});

test("a result with no model override fails when `--model` names one, and passes with the model", async () => {
	const bad = fake([0, 0]);
	expect(await runBoth("a", "b", ["--model=haiku"], bad.spawn, bad.log)).toBe(
		1,
	);
	const ok = fake([0, 0], [(p) => good(p, "haiku"), (p) => good(p, "haiku")]);
	expect(await runBoth("a", "b", ["--model", "haiku"], ok.spawn, ok.log)).toBe(
		0,
	);
});

test("`modelOf` reads both forms of `--model`", () => {
	expect(modelOf(["--model", "haiku"])).toBe("haiku");
	expect(modelOf(["--model=haiku"])).toBe("haiku");
	expect(modelOf(["--runs", "1"])).toBe(undefined);
});

test("a passing verdict gives the runs of each case next to it", async () => {
	const f = fake([0, 0]);
	expect(await runBoth("a", "b", [], f.spawn, f.log)).toBe(0);
	expect(verdictLine(f.lines).match(/\b10\b/g)).toHaveLength(2);
});
