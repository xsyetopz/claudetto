import { describe, expect, test } from "bun:test";
import {
	claudeArgv,
	inlinePluginOptions,
	maxBudget,
	NO_SESSION_PERSISTENCE,
	outputFormat,
	permissionMode,
	pluginDir,
	print,
	settingSources,
	settings,
} from "../argv.ts";

describe("claudeArgv", () => {
	test("starts with `claude` and keeps the parts in the order given", () => {
		const argv = claudeArgv(
			print("hi"),
			pluginDir("/p"),
			permissionMode("plan"),
		);

		expect(argv).toEqual([
			"claude",
			"-p",
			"hi",
			"--plugin-dir",
			"/p",
			"--permission-mode",
			"plan",
		]);
	});

	test("takes an empty part as no words", () => {
		expect(claudeArgv(print("hi"), [])).toEqual(["claude", "-p", "hi"]);
	});
});

describe("the flag parts", () => {
	test("`stream-json` carries `--verbose` and `json` does not", () => {
		expect(outputFormat("stream-json")).toEqual([
			"--output-format",
			"stream-json",
			"--verbose",
		]);
		expect(outputFormat("json")).toEqual(["--output-format", "json"]);
	});

	test("joins the setting sources with a comma", () => {
		expect(settingSources("project", "local")).toEqual([
			"--setting-sources",
			"project,local",
		]);
	});

	test("keeps a budget given as text exactly as written", () => {
		expect(maxBudget("1.20")).toEqual(["--max-budget-usd", "1.20"]);
		expect(maxBudget(2)).toEqual(["--max-budget-usd", "2"]);
	});

	test("names the flag that stops a session from being stored", () => {
		expect(NO_SESSION_PERSISTENCE).toEqual(["--no-session-persistence"]);
	});

	test("writes the settings object as one JSON word with the plugin options inside", () => {
		const part = settings({
			env: { A: "1" },
			...inlinePluginOptions({ compaction: "built-in" }),
		});

		expect(part[0]).toBe("--settings");
		expect(JSON.parse(part[1] ?? "")).toEqual({
			env: { A: "1" },
			pluginConfigs: {
				"claudetto@inline": { options: { compaction: "built-in" } },
			},
		});
	});
});
