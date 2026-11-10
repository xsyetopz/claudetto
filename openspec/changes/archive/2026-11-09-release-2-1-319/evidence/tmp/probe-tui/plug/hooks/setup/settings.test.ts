import { expect, test } from "claude-code/testing";

import { AUTO_MODE } from "./auto-mode.ts";
import {
	applyChanges,
	capGroup,
	changesOf,
	DENIED_TOOLS,
	GROUPS,
	type Json,
	parseSettings,
	STATUS_LINE,
	valueAt,
} from "./settings.ts";

const BUILTIN_KEY = /^cc-plugin-.+@builtin$/;

const everything = (held: Json): Json => {
	let settings = held;
	for (const group of GROUPS) {
		settings = applyChanges(settings, changesOf(settings, group), "replace");
	}
	return settings;
};

test("an empty file takes every group, and a second pass finds nothing to change", () => {
	const written = everything({});

	expect(GROUPS.flatMap((group) => changesOf(written, group))).toEqual([]);
});

test("the eight tools of the tool-trim are denied", () => {
	const deny = valueAt(everything({}), ["permissions", "deny"]);

	for (const tool of [
		"Workflow",
		"ScheduleWakeup",
		"ReportFindings",
		"CronCreate",
		"CronDelete",
		"CronList",
		"EnterPlanMode",
		"ExitPlanMode",
	]) {
		expect(deny).toContain(tool);
	}
});

test("no built-in agent and no tool that ToolSearch or Skill need is denied", () => {
	expect(DENIED_TOOLS.filter((rule) => rule.startsWith("Agent("))).toEqual([]);
	for (const needed of ["ToolSearch", "Skill", "Bash"]) {
		expect(DENIED_TOOLS).not.toContain(needed);
	}
});

test("telemetry is off through DISABLE_TELEMETRY alone", () => {
	const written = everything({});

	expect(valueAt(written, ["env", "DISABLE_TELEMETRY"])).toBe("1");
	expect(JSON.stringify(written)).not.toContain(
		"CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
	);
	expect(JSON.stringify(written)).not.toContain("cc-plugin-telemetry");
});

test("a deny list keeps the user's rules and adds ours once", () => {
	const held = { permissions: { deny: ["Read(**/.env)", "Workflow"] } };
	const written = everything(held);
	const deny = valueAt(written, ["permissions", "deny"]);

	expect(deny).toContain("Read(**/.env)");
	expect(Array.isArray(deny) && deny.filter((r) => r === "Workflow")).toEqual([
		"Workflow",
	]);
});

test("fill keeps a value the user set, and replace takes ours", () => {
	const group = GROUPS.find((g) => g.label === "Worktrees");
	if (group === undefined) {
		throw new Error("no worktrees group");
	}
	const held = { worktree: { baseRef: "fresh" } };

	const changes = changesOf(held, group);

	expect(
		valueAt(applyChanges(held, changes, "fill"), ["worktree", "baseRef"]),
	).toBe("fresh");
	expect(
		valueAt(applyChanges(held, changes, "replace"), ["worktree", "baseRef"]),
	).toBe("head");
});

test("other keys of the user's file stay as they are", () => {
	const written = everything({ theme: "dark", env: { MINE: "1" } });

	expect(valueAt(written, ["theme"])).toBe("dark");
	expect(valueAt(written, ["env", "MINE"])).toBe("1");
});

test("a file that is not a JSON object is refused and a missing file is empty", () => {
	expect(parseSettings("[1]")).toBeUndefined();
	expect(parseSettings("{")).toBeUndefined();
	expect(parseSettings(undefined)).toEqual({});
});

test("the auto-mode lists replace the built-ins, so none names $defaults", () => {
	for (const list of Object.values(AUTO_MODE)) {
		expect(list.length).toBeGreaterThan(0);
		expect(list).not.toContain("$defaults");
	}
});

test("eleven built-in plugins are off as cc-plugin-<name>@builtin", () => {
	const entries = Object.entries(
		new Object(valueAt(everything({}), ["enabledPlugins"])),
	);

	expect(entries).toHaveLength(11);
	for (const [key, value] of entries) {
		expect(key).toMatch(BUILTIN_KEY);
		expect(value).toBe(false);
	}
});

test("auto mode writes no classifyAllShell", () => {
	expect(JSON.stringify(everything({}))).not.toContain("classifyAllShell");
});

test("the models are the three of this release and nothing else", () => {
	const text = JSON.stringify(GROUPS);
	const names = text.match(/claude-[a-z]+-[0-9-]+/g) ?? [];

	expect(new Set(names)).toEqual(
		new Set(["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]),
	);
});

test("the bundled-skill switch and the compaction keys are written", () => {
	const written = everything({});

	expect(valueAt(written, ["disableBundledSkills"])).toBe(true);
	expect(valueAt(written, ["autoCompactWindow"])).toBe(300_000);
	expect(valueAt(written, ["idleCompaction"])).toBe(false);
	expect(valueAt(written, ["env", "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE"])).toBe(
		"50.0000",
	);
});

test("the status line refreshes every 5 seconds, and fill keeps the user's own", () => {
	const mine = { statusLine: { type: "command", command: "mine" } };

	expect(
		valueAt(applyChanges({}, changesOf({}, STATUS_LINE), "fill"), [
			"statusLine",
			"refreshInterval",
		]),
	).toBe(5);
	expect(applyChanges(mine, changesOf(mine, STATUS_LINE), "fill")).toEqual(
		mine,
	);
});

const login = (tiers: Json): Json => ({ oauthAccount: tiers });

for (const [tiers, cap] of [
	[{ organizationType: "claude_pro" }, "3"],
	[{ organizationRateLimitTier: "default_claude_max_5x" }, "4"],
	[{ organizationRateLimitTier: "default_claude_max_20x" }, undefined],
	[{}, undefined],
] as const) {
	test(`a login of ${JSON.stringify(tiers)} caps subagents at ${cap ?? "nothing"}`, () => {
		const group = capGroup(login(tiers));

		expect(
			group &&
				valueAt(group.settings, [
					"env",
					"CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS",
				]),
		).toBe(cap);
	});
}

test("no login record writes no cap", () => {
	expect(capGroup(undefined)).toBeUndefined();
});
