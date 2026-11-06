import { describe, expect, spyOn, test } from "bun:test";
import { mkdir, readdir, utimes } from "node:fs/promises";
import { basename, join } from "node:path";
import { startFake } from "../fake/fake.ts";
import { DEFAULT_MODEL } from "../shared/model.ts";
import { tempDir } from "../shared/temp.ts";
import { createRun } from "../workspace/workspace.ts";
import { COMMANDS } from "./commands.ts";

const RACE = [
	"2026-11-05T16:22:19.481Z [DEBUG] Reading through symlink: /tmp/x.settings.json",
	"2026-11-05T16:22:19.693Z [DEBUG] hooks module claudetto@inline settings.read settled in 13.7ms (worker hop, next() included)",
	"2026-11-05T16:22:19.776Z [DEBUG] [API REQUEST] /v1/messages source=sdk",
].join("\n");

const run = (module: string, argv: string[]): Promise<string> => {
	const c = COMMANDS[module];
	if (!c) {
		throw new Error(`no ${module}`);
	}
	return c.run(argv);
};

const file = async (name: string, text: string): Promise<string> => {
	const path = join(await tempDir("cli"), name);
	await Bun.write(path, text);
	return path;
};

describe("runs", () => {
	test("clean prints and keeps the old folders without --yes, and deletes only them with it", async () => {
		const root = await tempDir("cli-runs");
		const old = await createRun({ probe: "p", root, quiet: true });
		const fresh = await createRun({ probe: "p", root, quiet: true });
		const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000);
		await utimes(old.dir, twoDaysAgo, twoDaysAgo);
		const args = ["clean", "--probe", "p", "--older-than-days", "1", "--root", root];
		expect(await run("runs", args)).toContain("1 run folders would be deleted; pass --yes");
		expect(await readdir(join(root, "p"))).toHaveLength(2);
		expect(await run("runs", [...args, "--yes"])).toContain("1 run folders deleted");
		expect(await readdir(join(root, "p"))).toEqual([basename(fresh.dir)]);
	});

	test("clean refuses a non-number age", async () => {
		await expect(run("runs", ["clean", "--probe", "p", "--older-than-days", "soon"])).rejects.toThrow("not a number");
	});
});

describe("ledger", () => {
	test("admits a run under the per-run cap and refuses one over it", async () => {
		const empty = join(await tempDir("cli-ledger"), "ledger.jsonl");
		expect(await run("ledger", ["show", empty, "--bound", "1000"])).toContain("admitted");
		expect(await run("ledger", ["show", empty, "--bound", "300001"])).toContain("refused: run bound 300001 > cap 300000");
	});
});

describe("timing", () => {
	test("says whether a hook settled before the first request, and unknown when a mark is missing", async () => {
		const log = await file("debug.log", RACE);
		expect(await run("timing", [log, "--module", "claudetto@inline", "--event", "settings.read"])).toContain(
			"settled before first request: true",
		);
		expect(await run("timing", [log, "--module", "absent@inline", "--event", "settings.read"])).toContain("unknown");
	});
});

describe("reply", () => {
	test("reads stream-json segments and refuses a lone result object", async () => {
		const frames = [
			{ type: "assistant", message: { id: "msg_a", content: [{ type: "text", text: "First part. More." }] } },
			{ type: "result", subtype: "success", is_error: false, result: "More." },
		];
		const stream = await file("out.jsonl", frames.map((f) => JSON.stringify(f)).join("\n"));
		expect(await run("reply", [stream])).toContain('first sentence: "First part."');
		const lone = await file("out.json", JSON.stringify({ type: "result", result: "tail only" }));
		await expect(run("reply", [lone, "--format", "json"])).rejects.toThrow("reply incomplete");
	});
});

describe("arm", () => {
	test("fails with the diff on a mismatch", async () => {
		const expectFile = await file("expect.json", JSON.stringify({ model: "claude-haiku-5-5" }));
		const log = await file("debug.log", "");
		const good = await file("req.json", JSON.stringify({ model: "claude-haiku-5-5" }));
		const bad = await file("req.json", JSON.stringify({ model: "claude-opus-5-5" }));
		expect(await run("arm", ["assert", expectFile, log, good])).toBe("arm check ok");
		await expect(run("arm", ["assert", expectFile, log, bad])).rejects.toThrow('model: want "claude-haiku-5-5"');
	});
});

describe("grade", () => {
	test("refuses a grader whose bad fixture passes", async () => {
		const grader = (pass: string) =>
			`export default { name: "g", fixtures: { good: ["ok"], bad: ["no"] }, grade: (t) => ({ pass: ${pass}, label: "x", evidence: t }) };`;
		expect(await run("grade", ["check", await file("good.ts", grader('t === "ok"'))])).toBe("grader g ok");
		await expect(run("grade", ["check", await file("bad.ts", grader("true"))])).rejects.toThrow("grader g unusable");
	});
});

describe("launch", () => {
	test("runs claude against the fake, and refuses a string where a number belongs", async () => {
		const fake = await startFake({
			plan: { steps: [{ reply: { blocks: [{ type: "text", text: "CLI." }] } }] },
			dir: await tempDir("cli-fake"),
		});
		const info = spyOn(console, "info").mockImplementation(() => {});
		try {
			const spec = await file("spec.json", JSON.stringify({ prompt: "hi", mode: "json", model: DEFAULT_MODEL, baseUrl: fake.url }));
			const out = await run("launch", [spec, "--probe", "cli"]);
			expect(out).toContain("exit 0");
			expect([out, ...info.mock.calls.flat()].join("\n").match(/^run /gm)).toHaveLength(1);
		} finally {
			info.mockRestore();
			await fake.stop();
		}
		const plugin = await tempDir("cli-plugin");
		await mkdir(join(plugin, ".claude-plugin"));
		await Bun.write(
			join(plugin, ".claude-plugin", "plugin.json"),
			JSON.stringify({ name: "demo", userConfig: { handoverTokens: { type: "number" } } }),
		);
		const bad = await file(
			"spec.json",
			JSON.stringify({
				prompt: "hi",
				mode: "json",
				model: DEFAULT_MODEL,
				pluginDirs: [plugin],
				settings: { pluginConfigs: { demo: { options: { handoverTokens: "16000" } } } },
			}),
		);
		await expect(run("launch", [bad, "--probe", "cli"])).rejects.toThrow("want number");
	});
});

describe("fake", () => {
	test("prints its own pid, stops its server on SIGINT or SIGTERM, and refuses a missing folder", async () => {
		const plan = await file("plan.json", JSON.stringify({ steps: [] }));
		const printed: string[] = [];
		const log = spyOn(console, "log").mockImplementation((s: string) => printed.push(s));
		try {
			for (const signal of ["SIGINT", "SIGTERM"] as const) {
				printed.length = 0;
				const serving = run("fake", ["serve", plan, await tempDir("cli-fake")]);
				while (printed.length === 0) {
					await Bun.sleep(20);
				}
				const [, url, pid, server] = /^url (\S+)\npid (\d+)\nserver pid (\d+)$/.exec(printed[0] ?? "") ?? [];
				expect(Number(pid)).toBe(process.pid);
				expect((await fetch(`${url}/v1/messages/count_tokens`, { method: "POST", body: "{}" })).ok).toBe(true);
				process.emit(signal);
				expect(await serving).toBe("stopped");
				expect(() => process.kill(Number(server), 0)).toThrow();
			}
		} finally {
			log.mockRestore();
		}
		await expect(run("fake", ["serve", plan])).rejects.toThrow("DIR: missing");
	});
});

describe("ab", () => {
	test("plans arms × cases × n with no call", async () => {
		const experiment = `export default { name: "e", arms: [{ name: "a" }, { name: "b" }], cases: [{ name: "c" }], n: 2, parallel: 1, tokenBoundPerRun: 10 };`;
		expect(await run("ab", ["plan", await file("e.ts", experiment)])).toContain("4 sessions, bound 40 tokens");
	});

	test("an unknown command names itself", async () => {
		await expect(run("ab", ["go"])).rejects.toThrow('ab command "go": unknown');
	});
});
