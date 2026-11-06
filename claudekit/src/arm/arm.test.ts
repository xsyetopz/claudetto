import { beforeAll, describe, expect, test } from "bun:test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { mainRequests, readRequests, startFake } from "../fake/fake.ts";
import { launch, runFiles } from "../launcher/launcher.ts";
import { DEFAULT_MODEL } from "../shared/model.ts";
import { tempDir } from "../shared/temp.ts";
import { createRun } from "../workspace/workspace.ts";
import { type ArmExpect, assertArm, materializeArm, treeHash } from "./arm.ts";

const MATCHES_NOTHING = /matches nothing/;

const plugin = async (): Promise<string> => {
	const dir = await tempDir("plugin");
	await mkdir(join(dir, ".claude-plugin"));
	await mkdir(join(dir, "agents"));
	await Bun.write(join(dir, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "demo" }));
	await Bun.write(
		join(dir, "agents", "scout.md"),
		"---\nname: scout\ndescription: Reads files.\n---\nRead the named file.\n",
	);
	return dir;
};

let evidence: { debugLog: string; firstRequest: unknown };

beforeAll(async () => {
	const run = await createRun({ probe: "arm", root: await tempDir("arm"), quiet: true });
	const requests = join(run.dir, "requests");
	const fake = await startFake({ plan: { steps: [] }, dir: requests });
	try {
		await launch(
			{
				prompt: "hi",
				mode: "json",
				model: DEFAULT_MODEL,
				baseUrl: fake.url,
				pluginDirs: [await plugin()],
				settings: { outputStyle: "Explanatory" },
			},
			run,
		);
	} finally {
		await fake.stop();
	}
	const [first] = mainRequests(await readRequests(requests));
	evidence = { debugLog: await Bun.file(runFiles(run).debug).text(), firstRequest: first?.body };
}, 120_000);

describe("assertArm against a real launch", () => {
	const good: ArmExpect = {
		plugins: ["demo"],
		agents: { demo: 1 },
		outputStyle: "Explanatory",
		model: DEFAULT_MODEL,
		toolsInclude: ["Bash"],
	};

	test("passes when the expectation matches what loaded", () => {
		const check = assertArm(good, evidence);
		expect(check.diff).toEqual([]);
		expect(check.ok).toBe(true);
	});

	test("fails with one diff line per wrong field", () => {
		const check = assertArm(
			{ ...good, plugins: ["absent"], agents: { demo: 2 }, outputStyle: "Concise", toolsExclude: ["Bash"] },
			evidence,
		);
		expect(check.ok).toBe(false);
		expect(check.diff).toHaveLength(4);
	});
});

describe("assertArm on deferred tools", () => {
	const request = {
		tools: [{ name: "ToolSearch" }],
		messages: [
			{ role: "user", content: "hi" },
			{
				role: "system",
				content:
					"The following deferred tools are now available via ToolSearch. Use ToolSearch to load them:\nWebFetch\nmcp__demo__echo\n\nAvailable agent types:",
			},
		],
	};

	test("a tool named only in the deferred list counts as present", () => {
		const check = assertArm({ toolsInclude: ["mcp__demo__echo"], toolsExclude: ["Available agent types:"] }, {
			debugLog: "",
			firstRequest: request,
		});
		expect(check.diff).toEqual([]);
		expect(check.observed.deferredTools).toEqual(["WebFetch", "mcp__demo__echo"]);
	});

	test("excluding a deferred tool fails", () => {
		const check = assertArm({ toolsExclude: ["WebFetch"] }, { debugLog: "", firstRequest: request });
		expect(check.diff).toEqual(["tool WebFetch: present in the first request (deferred)"]);
	});

	test("an exact tools list fails on a tool sent beyond it, and ignores the deferred list", () => {
		expect(assertArm({ tools: ["ToolSearch"] }, { debugLog: "", firstRequest: request }).diff).toEqual([]);
		const leaked = { ...request, tools: [{ name: "ToolSearch" }, { name: "mcp__claude_ai_Docs__read" }] };
		expect(assertArm({ tools: ["ToolSearch"] }, { debugLog: "", firstRequest: leaked }).diff).toEqual([
			'tools: want ["ToolSearch"] got ["ToolSearch","mcp__claude_ai_Docs__read"]',
		]);
	});
});

describe("materializeArm", () => {
	test("a copy hashes the same as its source, and a patch changes the hash", async () => {
		const src = await plugin();
		const run = { dir: await tempDir("arm-run") };
		const same = await materializeArm({ name: "base", plugins: [{ dir: src }] }, run);
		const patched = await materializeArm(
			{ name: "fix", plugins: [{ dir: src, patches: [{ file: "agents/scout.md", find: "Read", replace: "Open" }] }] },
			run,
		);
		const source = await treeHash(src);
		expect(Object.values(same.treeHashes)).toEqual([source]);
		expect(Object.values(patched.treeHashes)[0]).not.toBe(source);
	});

	test("refuses a patch that matches nothing", async () => {
		const run = { dir: await tempDir("arm-run") };
		const arm = { name: "bad", plugins: [{ dir: await plugin(), patches: [{ file: "agents/scout.md", find: "ABSENT", replace: "x" }] }] };
		await expect(materializeArm(arm, run)).rejects.toThrow(MATCHES_NOTHING);
	});
});
