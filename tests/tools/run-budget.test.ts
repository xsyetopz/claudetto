// The budget reader checks the `tracePath` of each run in an `aggregate-result.json` against the tags of its case.

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { write as bunWrite } from "bun";
import { budgetFaultsIn, caseTags, parseTrace } from "../../dev/run-budget.ts";

const N_1_2_RE = /\b1\b[^\n]*\b2\b/;

const tags = { a: ["max-tool-calls:1", "max-tokens:10"] };
const call = (name: string) =>
	JSON.stringify({
		type: "assistant",
		message: { content: [{ type: "tool_use", name, input: {} }] },
	});
const result = (n: number) =>
	JSON.stringify({
		type: "result",
		result: "ok",
		usage: { input_tokens: n, output_tokens: 0 },
	});

/** A folder with the traces, and an `aggregate-result.json` whose case `name` holds the runs of the `with` and `without` arms. */
const stub = async (
	name: string,
	withTraces: (string | null)[],
	withoutTraces: (string | null)[] = [],
) => {
	const dir = await mkdtemp(join(tmpdir(), "run-budget-"));
	let n = 0;
	const run = async (text: string | null) => {
		if (text === null) {
			return {};
		}
		const tracePath = join(dir, `t${n++}.jsonl`);
		await bunWrite(tracePath, text);
		return { tracePath };
	};
	const agg = {
		cases: [
			{
				name,
				arms: {
					with: await Promise.all(withTraces.map(run)),
					without: await Promise.all(withoutTraces.map(run)),
				},
			},
		],
	};
	await bunWrite(join(dir, "r/aggregate-result.json"), JSON.stringify(agg));
	return dir;
};

test("a trace in budget has no fault", async () => {
	const dir = await stub("a", [`${call("Bash")}\n${result(5)}\n`]);
	const r = await budgetFaultsIn([dir], tags);
	expect(r.faults).toEqual([]);
	expect(r.checked).toBe(1);
});

test("a trace over a bound names the case, arm, and run", async () => {
	const dir = await stub("a", [
		`${call("Bash")}\n${result(5)}\n`,
		`${call("Bash")}\n${call("Edit")}\n${result(50)}\n`,
	]);
	const r = await budgetFaultsIn([join(dir, "r/aggregate-result.json")], tags);
	expect(r.faults).toHaveLength(2);
	expect(r.faults.join()).toContain("a with[1]");
	expect(r.faults.join()).toContain("max-tool-calls:1");
	expect(r.faults.join()).toContain("max-tokens:10");
});

test("the without arm is only reported", async () => {
	const dir = await stub(
		"a",
		[`${call("Bash")}\n`],
		[`${call("A")}\n${call("B")}\n`, null],
	);
	const r = await budgetFaultsIn([dir], tags);
	expect(r.faults).toEqual([]);
	expect(r.info.join()).toMatch(N_1_2_RE);
});

test("a missing tracePath, a missing trace, a bad line, and an unknown case are faults", async () => {
	const none = await budgetFaultsIn([await stub("a", [null])], tags);
	expect(none.faults).toHaveLength(1);
	expect(none.faults.join()).toContain("tracePath");
	const dir = await stub("a", ["not json\n"]);
	const bad = await budgetFaultsIn([dir], tags);
	expect(bad.faults).toHaveLength(1);
	await bunWrite(
		join(dir, "r/aggregate-result.json"),
		JSON.stringify({
			cases: [
				{ name: "a", arms: { with: [{ tracePath: join(dir, "gone") }] } },
			],
		}),
	);
	const gone = await budgetFaultsIn([dir], tags);
	expect(gone.faults).toHaveLength(1);
	expect(gone.faults).not.toEqual(bad.faults);
	const unknown = await budgetFaultsIn(
		[await stub("zzz", [`${call("A")}\n`])],
		tags,
	);
	expect(unknown.faults).toHaveLength(1);
});

test("a folder with no result file is a fault", async () => {
	const dir = await mkdtemp(join(tmpdir(), "run-budget-"));
	expect((await budgetFaultsIn([dir], tags)).faults).toHaveLength(1);
});

test("parseTrace reads stream-json lines", () => {
	expect(parseTrace('{"type":"x"}\n\n')).toEqual({
		run: { events: [{ type: "x" }], files: {} },
	});
});

test("the tags of the real cases are read", async () => {
	const all = await caseTags(join(import.meta.dir, "../.."));
	expect(Object.keys(all).length).toBeGreaterThan(0);
});
