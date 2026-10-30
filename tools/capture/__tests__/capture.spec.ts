// Every expected number here is arithmetic written out, not a figure copied from the tool.

import { describe, expect, test } from "bun:test";
import { builtinSnippet } from "../../../plugins/claudetto/src/builtins.ts";
import { denyRules } from "../../../plugins/claudetto/src/tiers/snippet.ts";
import { extraArgs } from "../run.ts";
import { scoreOf } from "../score.ts";
import { denySettings, shippedSettings } from "../settings.ts";

describe("the settings of one run", () => {
	test("a deny arm writes the names under `permissions.deny`", () => {
		const text = denySettings(["Workflow", "ReportFindings"]);

		expect(JSON.parse(text)).toEqual({
			permissions: { deny: ["Workflow", "ReportFindings"] },
		});
	});

	test("the shipped arm carries the deny list, the built-in switches, and the prompt surfaces", () => {
		const settings: unknown = JSON.parse(shippedSettings());

		// Read from the module rather than copied, so the plugin ids live in one place.
		expect(settings).toMatchObject({
			permissions: { deny: [...denyRules()] },
			agent: "claudetto:main",
			outputStyle: "claudetto:Concise",
			...builtinSnippet(),
		});
		expect(shippedSettings()).toContain('"sandbox"');
	});

	test("the shipped arm carries no `autoMode`, because the figures describe an install", () => {
		// `/claudetto:setup` writes no `autoMode`: its facts are readings of this repository (`UNSHIPPED_KEYS`).
		expect(shippedSettings()).not.toContain('"autoMode"');
	});
});

describe("the score of one request", () => {
	test("splits a request into its system, tools, and messages characters", () => {
		const body = {
			system: [
				{ type: "text", text: "abc" },
				{ type: "text", text: "de" },
			],
			tools: [{ name: "Read" }],
			messages: [{ role: "user", content: "hi" }],
		};
		const raw = JSON.stringify(body);

		const score = scoreOf(raw);

		expect(score.total).toBe(raw.length);
		expect(score.system).toBe(5);
		expect(score.blocks).toEqual([3, 2]);
		expect(score.toolCount).toBe(1);
		expect(score.tools).toBe(JSON.stringify(body.tools).length);
		expect(score.messages).toBe(JSON.stringify(body.messages).length);
	});

	test("reads a system sent as one string", () => {
		const score = scoreOf(JSON.stringify({ system: "abcd" }));

		expect(score.system).toBe(4);
		expect(score.blocks).toEqual([4]);
	});

	test("counts a request with no tools and no messages as zero plus `null`", () => {
		const score = scoreOf(JSON.stringify({ system: "" }));

		// `JSON.stringify(null)` is the 4 characters `null`.
		expect(score.tools).toBe(4);
		expect(score.messages).toBe(4);
		expect(score.toolCount).toBe(0);
		expect(score.perTool).toEqual([]);
	});

	test("lists each tool with its own characters, the largest first", () => {
		const small = { name: "A" };
		const large = { name: "B", description: "a longer one" };

		const score = scoreOf(JSON.stringify({ tools: [small, large] }));

		expect(score.perTool).toEqual([
			{ name: "B", chars: JSON.stringify(large).length, desc: 12 },
			{ name: "A", chars: JSON.stringify(small).length, desc: 0 },
		]);
	});
});

describe("the extra flags of each run", () => {
	test("`--mcp-config` loads only that file's servers, and `--plugin-dir` adds a plugin", () => {
		const args = [
			"--arm",
			"plain",
			"--mcp-config",
			"c7.json",
			"--plugin-dir",
			"/tmp/probe",
		];

		expect(extraArgs(args)).toEqual([
			"--mcp-config",
			"c7.json",
			"--strict-mcp-config",
			"--plugin-dir",
			"/tmp/probe",
		]);
	});

	test("`--classifier` runs in auto mode, so a tool call reaches the classifier", () => {
		expect(extraArgs(["--classifier"])).toEqual(["--permission-mode", "auto"]);
	});

	test("a run with neither flag passes nothing extra", () => {
		expect(extraArgs(["--arm", "plain"])).toEqual([]);
	});
});
