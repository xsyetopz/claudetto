import { expect, test } from "claude-code/testing";

import { AUTO_MODE } from "./auto-mode";
import { applyChanges, capGroup, changesOf, parseSettings } from "./changes";
import { DENIED_TOOLS, GROUPS, STATUS_LINE, valueAt } from "./settings";
import { capOf, everything, groupNamed, listOf, login } from "./settings.mock";

const BUILTIN_KEY = /^cc-plugin-.+@builtin$/u;
const SIGNING_KEYS = /\.ssh|\.gnupg/u;

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
	expect(listOf(deny).filter((r) => r === "Workflow")).toEqual(["Workflow"]);
});

test("fill keeps a value the user set, and replace takes ours", () => {
	const group = groupNamed("Worktrees");
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
	expect(parseSettings("[1]", () => void 0)).toBeUndefined();
	expect(parseSettings("{", () => void 0)).toBeUndefined();
	expect(parseSettings(undefined, () => void 0)).toEqual({});
});

test("the auto-mode lists replace the built-ins, so none names $defaults", () => {
	for (const list of Object.values(AUTO_MODE)) {
		expect(list.length).toBeGreaterThan(0);
		expect(list).not.toContain("$defaults");
	}
});

test("the environment list defines the trusted repo that the rules lean on", () => {
	expect(
		AUTO_MODE.environment.filter((entry) =>
			/^\*\*(?:Trusted repo|Source control)\*\*: /u.test(entry),
		),
	).toHaveLength(2);
});

// The client names a block's rule only when the server cites a `soft_deny` entry, so every block needs one to cite.
test("a write to another repo and every other danger each have a soft rule to cite", () => {
	const names = AUTO_MODE.soft_deny.map((entry) => entry.split(" [")[0]);
	expect(names).toContain("Write Outside the Trusted Repo");
	expect(names.at(-1)).toBe("Any Other Danger");
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
	const names = Array.from(
		text.matchAll(/claude-[a-z]+-[0-9-]+/gu),
		(match) => match[0],
	);

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

for (const [tiers, cap, label] of [
	[{ organizationType: "claude_pro" }, "3", "3"],
	[{ organizationRateLimitTier: "default_claude_max_5x" }, "4", "4"],
	[
		{ organizationRateLimitTier: "default_claude_max_20x" },
		undefined,
		"nothing",
	],
	[{}, undefined, "nothing"],
] as const) {
	test(`a login of ${JSON.stringify(tiers)} caps subagents at ${label}`, () => {
		expect(capOf(login(tiers))).toBe(cap);
	});
}

test("no login record writes no cap", () => {
	expect(capGroup()).toBeUndefined();
});

test("a plan is found in either tier field, and only by a string name", () => {
	expect(
		capOf(
			login({
				organizationRateLimitTier: "default_claude_max_20x",
				organizationType: "claude_pro",
			}),
		),
	).toBe("3");
	expect(capOf(login({ organizationType: ["claude_pro"] }))).toBeUndefined();
	expect(capGroup({ oauthAccount: "claude_pro" })).toBeUndefined();
});

test("the cap group is labelled and names the cap and the plan", () => {
	const group = capGroup(login({ organizationType: "claude_pro" }));

	expect(group?.label).toBe("Subagent cap");
	expect(group?.why).toContain(
		"at once at 3: the claude_pro plan has a 5-hour window",
	);
});

test("a sandbox list the user holds stays under fill", () => {
	const group = groupNamed("Sandbox");
	const held = { sandbox: { filesystem: { allowWrite: ["~/mine"] } } };

	const written = applyChanges(held, changesOf(held, group), "fill");

	expect(valueAt(written, ["sandbox", "filesystem", "allowWrite"])).toEqual([
		"~/mine",
	]);
	expect(valueAt(written, ["sandbox", "enabled"])).toBe(true);
});

test("a null value in the user's file is replaced, not walked into", () => {
	const group = groupNamed("Worktrees");
	const held = { worktree: null };

	const changes = changesOf(held, group);

	expect(changes).toEqual([
		{ path: "worktree.baseRef", had: undefined, wanted: "head" },
	]);
	expect(applyChanges(held, changes, "fill")).toEqual({
		worktree: { baseRef: "head" },
	});
	expect(parseSettings("null", () => void 0)).toBeUndefined();
});

test("only a permission list merges; another list is replaced", () => {
	const models = groupNamed("Models and windows");
	const held = { fallbackModel: ["mine"] };

	expect(
		valueAt(applyChanges(held, changesOf(held, models), "replace"), [
			"fallbackModel",
		]),
	).toEqual(["claude-sonnet-5-5"]);
});

test("a deny list gains our rules after the user's, and fill adds the rules a list lacks", () => {
	const held = { permissions: { deny: ["Mine"], allow: ["Bash(ls)"] } };
	const prompt = groupNamed("Smaller prompt");
	const filled = applyChanges(held, changesOf(held, prompt), "fill");

	expect(valueAt(filled, ["permissions", "deny"])).toEqual([
		"Mine",
		...DENIED_TOOLS,
	]);
	expect(valueAt(filled, ["permissions", "allow"])).toEqual([
		"Bash(ls)",
		"Bash(git status *)",
		"Bash(git diff)",
		"Bash(git log)",
		"Bash(git show)",
	]);
});

test("the sandbox's denyRead leaves the signing keys readable", () => {
	const denyRead = valueAt(everything({}), [
		"sandbox",
		"filesystem",
		"denyRead",
	]);

	expect(listOf(denyRead).length).toBeGreaterThan(0);
	expect(JSON.stringify(denyRead)).not.toMatch(SIGNING_KEYS);
});
