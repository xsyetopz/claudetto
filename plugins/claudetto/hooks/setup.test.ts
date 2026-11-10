import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { unguarded } from "./gate/walled.ts";
import { FILE, type Lab, lab, run, saved } from "./setup.mock.ts";
import { valueAt } from "./setup/settings.ts";
import { recommended } from "./setup/text.ts";

test("setup on an empty file writes the telemetry env and the eight denies and no Agent deny", async ($: Engine, on: On) => {
	const state = lab(on);

	await run($, "claudetto:setup");
	const text = JSON.stringify(saved(state));

	expect(text).toContain('"DISABLE_TELEMETRY":"1"');
	expect(text).not.toContain("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC");
	expect(text).not.toContain("cc-plugin-telemetry");
	expect(text).not.toContain("Agent(");
	expect(text).toContain('"baseRef":"head"');
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
		expect(text).toContain(`"${tool}"`);
	}
});

const BASE_WRITES = ["~/", "/Volumes/", "/private/tmp"];

const allowWrite = (state: Lab): unknown =>
	valueAt(saved(state), ["sandbox", "filesystem", "allowWrite"]);

test("A Cache Folder Named by an Env Var: setup writes no entry for it, because allowWrite covers it", async ($: Engine, on: On) => {
	const state = lab(on);
	state.env = { BUN_INSTALL_CACHE_DIR: "/Volumes/DevAudioStore/bun-cache" };

	await run($, "claudetto:setup");

	expect(allowWrite(state)).toEqual(BASE_WRITES);
});

test(
	"each protected path gets a Read deny that silences the startup wall notice",
	{
		options: {
			protectedPaths: ["~/.claudetto-holdout", "$HOME/b", "/srv/holdout/"],
		},
	},
	async ($: Engine, on: On) => {
		const state = lab(on);

		await run($, "claudetto:setup");
		const permissions = valueAt(saved(state), ["permissions"]);

		expect(valueAt(saved(state), ["permissions", "deny"])).toEqual(
			expect.arrayContaining([
				"Read(~/.claudetto-holdout/**)",
				"Read(~/b/**)",
				"Read(//srv/holdout/**)",
			]),
		);
		expect(
			unguarded(
				["~/.claudetto-holdout", "$HOME/b", "/srv/holdout/"],
				permissions,
				"/home/u",
			),
		).toEqual([]);
	},
);

test("the default protected path gets its Read deny", async ($: Engine, on: On) => {
	const state = lab(on);

	await run($, "claudetto:setup");

	expect(valueAt(saved(state), ["permissions", "deny"])).toContain(
		"Read(~/.claudetto-holdout/**)",
	);
});

test(
	"with no protected path, setup writes no Read deny",
	{ options: { protectedPaths: [] } },
	async ($: Engine, on: On) => {
		const state = lab(on);

		await run($, "claudetto:setup");

		expect(JSON.stringify(saved(state))).not.toContain("Read(");
	},
);

test("a settings file that is not a JSON object is left as it is", async ($: Engine, on: On) => {
	const state = lab(on, "[1");

	await run($, "claudetto:setup");

	expect(state.written).toEqual([]);
});

test("a dismissed dialog writes nothing and says so", async ($: Engine, on: On) => {
	const state = lab(on, "{}", () => {
		throw new Error("dismissed");
	});

	await run($, "claudetto:setup");

	expect(state.written.filter((w) => w.path === FILE)).toEqual([]);
});

test("a Skip on every group writes no settings file", async ($: Engine, on: On) => {
	const state = lab(on, "{}", () => "Skip");

	await run($, "claudetto:setup");

	expect(state.written.filter((w) => w.path === FILE)).toEqual([]);
});

test("a second run with everything in place asks nothing and writes nothing", async ($: Engine, on: On) => {
	const state = lab(on);
	await run($, "claudetto:setup");
	const writes = state.written.length;
	const asked = state.shown.filter((q) => !q.startsWith("Context7")).length;

	await run($, "claudetto:setup");

	expect(state.written).toHaveLength(writes);
	expect(state.shown.filter((q) => !q.startsWith("Context7"))).toHaveLength(
		asked,
	);
});

test("each setup question ends with Haiku's recommendation, and that option comes first", async ($: Engine, on: On) => {
	const state = lab(on, "{}", () => "Skip");
	state.advice = JSON.stringify({ pick: "Skip", why: "You set it yourself." });

	await run($, "claudetto:setup");

	const skippable = state.offered
		.map((options, i) => ({ options, i }))
		.filter(({ options }) => options.includes("Skip"))
		.map(({ i }) => i);
	expect(skippable.length).toBeGreaterThan(0);
	for (const i of skippable) {
		expect(state.shown[i]).toEndWith(
			recommended("Skip", "You set it yourself."),
		);
		expect(state.offered[i]?.[0]).toBe("Skip");
	}
});

test("a recommendation that names no option leaves the question as it was", async ($: Engine, on: On) => {
	const plain = lab(on, "{}", () => "Skip");
	await run($, "claudetto:setup");
	const before = { shown: [...plain.shown], offered: [...plain.offered] };
	plain.shown.length = 0;
	plain.offered.length = 0;
	plain.advice = JSON.stringify({ pick: "Maybe", why: "No such option." });

	await run($, "claudetto:setup");

	expect(plain.prompts.length).toBeGreaterThan(0);
	expect(plain.shown).toEqual(before.shown);
	expect(plain.offered).toEqual(before.offered);
});

test("Haiku never sees a secret that a setup question shows", async ($: Engine, on: On) => {
	const state = lab(on, "{}", () => "Skip");
	state.secrets = ["DISABLE_TELEMETRY"];
	state.advice = JSON.stringify({ pick: "Skip", why: "-" });

	await run($, "claudetto:setup");

	expect(state.shown.some((q) => q.includes("DISABLE_TELEMETRY"))).toBe(true);
	expect(state.prompts.some((p) => p.includes("[REDACTED]"))).toBe(true);
	expect(state.prompts.some((p) => p.includes("DISABLE_TELEMETRY"))).toBe(
		false,
	);
});

test("bare /statusline writes the line with no model turn, keeping other keys", async ($: Engine, on: On) => {
	const state = lab(on, '{"theme":"dark"}');

	const out = await run($, "statusline");
	const settings = saved(state);

	expect(settings["theme"]).toBe("dark");
	expect(JSON.stringify(settings["statusLine"])).toContain(
		"claudetto-statusline",
	);
	expect(out.text).toContain(FILE);
});

test("/statusline keeps a status line the user set and says so", async ($: Engine, on: On) => {
	const state = lab(on, '{"statusLine":{"type":"command","command":"mine"}}');

	await run($, "statusline");

	expect(state.written).toEqual([]);
});

test("/statusline run twice writes the file once", async ($: Engine, on: On) => {
	const state = lab(on, "{}");
	await run($, "statusline");

	await run($, "statusline");

	expect(state.written).toHaveLength(1);
});

test("/statusline on a file that is not a JSON object writes nothing and names it", async ($: Engine, on: On) => {
	const state = lab(on, "nope");

	const out = await run($, "statusline");

	expect(state.written).toEqual([]);
	expect(out.text).toContain(FILE);
});

test("/statusline with text goes on to the built-in command", async ($: Engine, on: On) => {
	lab(on, "{}");
	on("command.run", () => ({ text: "built-in" }));

	const out = await run($, "statusline", "show the branch");

	expect(out.text).toBe("built-in");
});

test("/statusline is described as making no model call", async ($: Engine, on: On) => {
	lab(on);
	const described = await $.command.describe({
		command: "statusline",
		description: "stock",
		isHidden: false,
		immediate: false,
		provider: { plugin: "claude-code", tier: "core" },
	});

	expect(described.description).not.toBe("stock");
});
