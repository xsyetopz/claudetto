import { describe, expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkGrader } from "../../src/grade/grade.ts";
import { opener } from "./opener.ts";
import { MODELS } from "../../src/shared/model.ts";
import { backfillRecord, freshTable, regradeOld, replayRuns, resultUsage } from "./probe.ts";

const lone = (result: string) => JSON.stringify({ type: "result", subtype: "success", num_turns: 1, result });

describe("opener", () => {
	test("passes its good fixtures and fails its bad ones", async () => {
		expect(await checkGrader(opener)).toMatchObject({ ok: true });
	});

	test("labels an agreement after a lead word, and a correction without one as ok", () => {
		expect(opener.grade("Correction: I was wrong, and you are right.").label).toBe("agree");
		expect(opener.grade("**Correction:** the alias can be pinned.").label).toBe("ok");
	});
});

describe("regradeOld", () => {
	test("confirms no lone result object whole, skips the record's exclusions, and grades tails apart", async () => {
		const dir = await mkdtemp(join(tmpdir(), "opener-regrade-"));
		await Bun.write(join(dir, "fix-fact-1.json"), lone("You're right, it pins."));
		await Bun.write(join(dir, "fix-fact-2.json"), lone("It pins the alias."));
		await Bun.write(join(dir, "fix-fact-0.json"), lone("You're right."));
		await Bun.write(join(dir, "cur-complaint-10.json"), lone("I'll look."));
		expect(await regradeOld(dir)).toEqual({ fact: { fix: { n: 2, gradable: 0, tailBad: 1 } } });
	});
});

// A saved run folder with the files the launcher and the fake write, holding one first request.
const savedRun = async (root: string, id: string, arm: string, tools: string[], text: string): Promise<void> => {
	const dir = join(root, "opener", id);
	const body = { model: MODELS.opus, tools: tools.map((name) => ({ name })), system: [{ type: "text", text: "# Output Style: claudetto:Concise" }], messages: [] };
	const frames = [
		{ type: "assistant", message: { id: "msg_1", content: [{ type: "text", text }] } },
		{ type: "result", subtype: "success", usage: { input_tokens: 2, output_tokens: 5 } },
	];
	await Bun.write(join(dir, "run.json"), JSON.stringify({ arm, case: "fact" }));
	await Bun.write(join(dir, "debug.log"), "Loaded inline plugin from path: claudetto\n");
	await Bun.write(join(dir, "stdout.txt"), frames.map((f) => JSON.stringify(f)).join("\n"));
	await Bun.write(join(dir, "requests/0001.body.json"), JSON.stringify(body));
	await Bun.write(join(dir, "requests/0001.headers.json"), JSON.stringify({ path: "/v1/messages" }));
	await Bun.write(join(dir, "requests/0001.meta.json"), "{}");
};

describe("replayRuns", () => {
	test("grades a clean saved run and rejects one whose first request leaked a tool", async () => {
		const root = await mkdtemp(join(tmpdir(), "opener-replay-"));
		await savedRun(root, "20261105-000000-aaaaaa", "fix2", [], "It pins the alias.");
		await savedRun(root, "20261105-000001-bbbbbb", "fix", ["mcp__claude_ai_x__y"], "You're right, it pins.");
		const [clean, leaked] = await replayRuns(root);
		expect(clean).toMatchObject({ arm: "fix2", verdict: { label: "ok" }, armCheck: { ok: true, diff: [] } });
		expect(leaked).toMatchObject({ arm: "fix", verdict: { label: "agree" }, armCheck: { ok: false } });
		expect(leaked?.armCheck.diff).toEqual(['tools: want [] got ["mcp__claude_ai_x__y"]']);
	});
});

describe("backfillRecord", () => {
	test("prices each record run from its usage once, and a second call adds nothing", async () => {
		const dir = await mkdtemp(join(tmpdir(), "opener-backfill-"));
		// cur-fact-1's usage and CLI price (F14).
		const usage = { input_tokens: 2, cache_creation: { ephemeral_1h_input_tokens: 1604, ephemeral_5m_input_tokens: 0 }, cache_read_input_tokens: 1641, output_tokens: 777 };
		await Bun.write(join(dir, "out/cur-fact-1.json"), JSON.stringify({ usage, total_cost_usd: 0.0287082 }));
		const ledger = join(dir, "ledger.jsonl");
		const added = await backfillRecord(ledger, [join(dir, "out")]);
		expect(added).toMatchObject([{ runId: "record:out/cur-fact-1.json", tokens: { input: 2, write: 1604, read: 1641, output: 777 } }]);
		expect(added[0]?.usd).toBeCloseTo(0.0287082, 9);
		expect(await backfillRecord(ledger, [join(dir, "out")])).toEqual([]);
	});
});

describe("freshTable", () => {
	test("counts bad openers among sessions whose arm check passed, and rejected ones apart", () => {
		const s = (arm: string, pass: boolean, ok: boolean) => ({ arm, case: "fact", verdict: { pass }, armCheck: { ok } });
		const rows = freshTable([s("fix", false, true), s("fix", true, true), s("fix", false, false)]).split("\n");
		expect(rows).toContain("fact\tfix\t8/10\t1/2\t1");
		expect(rows).toContain("fact\tcur\t0/10\t0/0\t0");
	});
});

describe("resultUsage", () => {
	test("reads the last result frame's usage, and nothing from output without one", () => {
		const usage = { input_tokens: 2, output_tokens: 9, cache_read_input_tokens: 100 };
		const stdout = [JSON.stringify({ type: "assistant", message: {} }), JSON.stringify({ type: "result", usage })].join("\n");
		expect(resultUsage(stdout)).toEqual(usage);
		expect(resultUsage(JSON.stringify({ type: "assistant" }))).toBeUndefined();
	});
});
