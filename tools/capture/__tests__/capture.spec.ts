// Every expected number here is arithmetic written out, not a figure copied from the tool.

import { describe, expect, test } from "bun:test";
import { builtinSnippet } from "../../../plugins/claudetto/src/builtins.ts";
import { denyRules } from "../../../plugins/claudetto/src/tiers/snippet.ts";
import { startFakeApi } from "../fake-api.ts";
import { extraArgs } from "../run.ts";
import { isClassifier, scoreOf } from "../score.ts";
import { denySettings, shippedSettings } from "../settings.ts";

describe("the fake Messages API", () => {
	test("keeps the body of a messages request and ends the turn", async () => {
		const api = startFakeApi();
		const body = JSON.stringify({ model: "m", stream: true, messages: [] });

		const answer = await fetch(`${api.url}/v1/messages`, {
			method: "POST",
			body,
		});
		const stream = await answer.text();
		await api.stop();

		expect(api.url.startsWith("http://127.0.0.1:")).toBe(true);
		expect(api.bodies).toEqual([body]);
		expect(api.others).toEqual([]);
		expect(stream).toContain("event: message_stop");
		expect(stream).toContain('"stop_reason":"end_turn"');
	});

	test("answers the first request that carries tools with the given tool call, and the next one with text", async () => {
		const api = startFakeApi({ name: "Bash", input: { command: "touch x" } });
		const body = JSON.stringify({ stream: true, tools: [{ name: "Bash" }] });
		const post = async (): Promise<string> =>
			(await fetch(`${api.url}/v1/messages`, { method: "POST", body })).text();

		const first = await post();
		const second = await post();
		await api.stop();

		expect(first).toContain('"type":"tool_use"');
		expect(first).toContain('"name":"Bash"');
		expect(first).toContain(
			JSON.stringify(JSON.stringify({ command: "touch x" })),
		);
		expect(first).toContain('"stop_reason":"tool_use"');
		expect(second).toContain('"stop_reason":"end_turn"');
	});

	test("answers a request that does not stream with one JSON message", async () => {
		const api = startFakeApi();

		const answer = await fetch(`${api.url}/v1/messages`, {
			method: "POST",
			body: JSON.stringify({ messages: [] }),
		});
		const message: unknown = await answer.json();
		await api.stop();

		expect(message).toMatchObject({
			type: "message",
			content: [{ type: "text", text: "ok" }],
			stop_reason: "end_turn",
		});
	});

	test("answers another route with an empty object and records it apart", async () => {
		const api = startFakeApi();

		const answer = await fetch(`${api.url}/v1/models`);
		const text = await answer.text();
		await api.stop();

		expect(text).toBe("{}");
		expect(api.bodies).toEqual([]);
		expect(api.others).toEqual(["GET /v1/models"]);
	});
});

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

	test("tells the auto mode classifier request by the opening of its system text", () => {
		const classifier = JSON.stringify({
			system: [
				{ type: "text", text: "x-anthropic-billing-header: v" },
				{
					type: "text",
					text: `You are a security monitor for autonomous AI coding agents.

## Context`,
				},
			],
		});
		const main = JSON.stringify({
			system: [{ type: "text", text: "You are Claude Code" }],
		});

		expect(isClassifier(classifier)).toBe(true);
		expect(isClassifier(main)).toBe(false);
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
