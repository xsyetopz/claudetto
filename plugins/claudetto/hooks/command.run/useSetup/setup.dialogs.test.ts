import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { valueAt } from "./settings.ts";
import {
	asked,
	choose,
	doOn,
	FILE,
	GO_REPO,
	isFew,
	isUndrawn,
	lab,
	run,
	saved,
	writtenAt,
} from "./setup.mock.ts";
import { statuslineEdit } from "./text.ts";

test("session.start registers no setup tool", async ($: Engine, on: On) => {
	lab(on);
	const names: string[] = [];
	on("session.start", () => ({ cwd: "/p" }));
	on("tool.register", (_$, e) => {
		names.push(e.name);
		return { value: { tool: `mcp__claudetto__${e.name}` } };
	});

	await $.session.start({ cwd: "/p", surface: null, isInteractive: false });

	expect(names.filter((name) => name.includes("setup"))).toEqual([]);
});

test("the command answers with text alone, so the model gets no turn", async ($: Engine, on: On) => {
	lab(on);

	const out = await run($, "claudetto:setup");

	expect(out.text).toBeDefined();
	expect(Object.keys(out)).not.toContain("prompt");
	expect(out.context).toBeUndefined();
});

test("each dialog offers two to four labels", async ($: Engine, on: On) => {
	const sizes: number[] = [];
	lab(
		on,
		"{}",
		(_question, options) => {
			sizes.push(options.length);
			return "Skip";
		},
		GO_REPO,
	);

	await run($, "claudetto:setup");

	expect(sizes.length).toBeGreaterThan(3);
	expect(sizes.every((size) => isFew(size))).toBe(true);
});

test("no dialog header, label, or description holds a character drawn as `�`", async ($: Engine, on: On) => {
	const state = lab(on, "{}", undefined, GO_REPO);

	await run($, "claudetto:setup");

	expect(state.shown.length).toBeGreaterThan(3);
	expect(state.drawn.filter(isUndrawn)).toEqual([]);
});

test("only the chosen group is written to the user settings file", async ($: Engine, on: On) => {
	const state = lab(on, "{}", choose(/^Starts a worktree/u, "Write"));

	await run($, "claudetto:setup");

	expect(saved(state)).toEqual({ worktree: { baseRef: "head" } });
});

test("the setup report names the groups written and gives no share of a limit", async ($: Engine, on: On) => {
	lab(on);

	const out = await run($, "claudetto:setup");

	expect(out.text).toContain("Smaller prompt");
	expect(out.text).not.toContain("%");
});

test("a clean write holds each planned key, only in the settings file, and no subagentStatusLine", async ($: Engine, on: On) => {
	const state = lab(on);

	await run($, "claudetto:setup");
	const written = saved(state);

	expect(valueAt(written, ["minimumVersion"])).toBe("2.1.318");
	expect(valueAt(written, ["workflowSizeGuideline"])).toBe("unrestricted");
	expect(valueAt(written, ["subagentPromptCacheTtl"])).toBe("1h");
	for (const key of [
		"workflowKeywordTriggerEnabled",
		"enableWorkflows",
		"enableArtifact",
		"remoteControlAtStartup",
	]) {
		expect(valueAt(written, [key])).toBe(false);
	}
	expect(valueAt(written, ["$schema"])).toContain("claude-code-settings.json");
	expect(valueAt(written, ["statusLine", "type"])).toBe("command");
	expect(JSON.stringify(written)).not.toContain("subagentStatusLine");
	expect(state.written.every((w) => w.path === FILE)).toBe(true);
});

test("a full write holds no agent key", async ($: Engine, on: On) => {
	const state = lab(on);

	await run($, "claudetto:setup");

	expect(Object.keys(saved(state))).not.toContain("agent");
});

test("a repo with neither memory file is shown the starter files, and a Write writes them", async ($: Engine, on: On) => {
	const state = lab(on, "{}", undefined, GO_REPO);

	await run($, "claudetto:setup");

	expect(asked(state, "Write these files")).toHaveLength(1);
	expect(writtenAt(state, "/p/AGENTS.md")).toContain("go");
	expect(writtenAt(state, "/p/CLAUDE.md")).toContain("@AGENTS.md");
});

test("a Skip writes no starter file", async ($: Engine, on: On) => {
	const state = lab(on, "{}", () => "Skip", GO_REPO);

	await run($, "claudetto:setup");

	expect(writtenAt(state, "/p/AGENTS.md")).toBeUndefined();
	expect(writtenAt(state, "/p/CLAUDE.md")).toBeUndefined();
});

test("a repo with an AGENTS.md is offered no starter file", async ($: Engine, on: On) => {
	const state = lab(on, "{}", undefined, GO_REPO);
	state.files.set("/p/AGENTS.md", "mine");

	await run($, "claudetto:setup");

	expect(asked(state, "Write these files")).toEqual([]);
});

test("a file that appears after the starter question is not overwritten", async ($: Engine, on: On) => {
	const state = lab(
		on,
		"{}",
		doOn(
			"Write these files",
			() => {
				state.files.set("/p/AGENTS.md", "mine");
			},
			"Write",
		),
		GO_REPO,
	);

	await run($, "claudetto:setup");

	expect(state.files.get("/p/AGENTS.md")).toBe("mine");
});

test("a Write puts the block after the user's lines, and the dialog shows the file diff", async ($: Engine, on: On) => {
	const state = lab(on, "{}", undefined, GO_REPO);
	state.files.set("/p/.gitignore", "node_modules\n");

	await run($, "claudetto:setup");

	const [dialog] = asked(state, "Grep");
	expect(dialog).toContain(".gitignore");
	expect(dialog).toContain("vendor/");
	expect(writtenAt(state, "/p/.gitignore")?.startsWith("node_modules\n")).toBe(
		true,
	);
	expect(writtenAt(state, "/p/.gitignore")).toContain("vendor/");
});

test("a Skip writes no ignore file", async ($: Engine, on: On) => {
	const state = lab(on, "{}", () => "Skip", GO_REPO);

	await run($, "claudetto:setup");

	expect(writtenAt(state, "/p/.gitignore")).toBeUndefined();
	expect(writtenAt(state, "/p/.ignore")).toBeUndefined();
});

test("a repo with an AGENTS.md is still offered the ignore files", async ($: Engine, on: On) => {
	const state = lab(on, "{}", undefined, GO_REPO);
	state.files.set("/p/AGENTS.md", "mine");

	await run($, "claudetto:setup");

	expect(asked(state, "Grep")).toHaveLength(1);
});

test("a folder that is not a git repo is offered nothing", async ($: Engine, on: On) => {
	const state = lab(on, "{}");

	await run($, "claudetto:setup");

	expect(asked(state, "Grep")).toEqual([]);
	expect(asked(state, "Write these files")).toEqual([]);
});

test("a settled repo is asked nothing, and a rerun changes no byte", async ($: Engine, on: On) => {
	const state = lab(on, undefined, undefined, GO_REPO);
	await run($, "claudetto:setup");
	const before = new Map(state.files);
	const dialogs = state.shown.length;

	await run($, "claudetto:setup");

	expect(
		state.shown.slice(dialogs).filter((q) => !q.startsWith("Context7")),
	).toEqual([]);
	expect(state.files).toEqual(before);
});

test("the built-in /statusline prompt is replaced, and a user's own skill keeps its text", async ($: Engine, on: On) => {
	lab(on);
	on("skill.prompt", (_$, e) => e);
	const stock = 'Create a status line with the prompt "show the branch"';

	const builtIn = await $.skill.prompt({
		skill: "statusline",
		text: stock,
		source: "built-in",
	});
	const own = await $.skill.prompt({
		skill: "statusline",
		text: stock,
		source: "user",
	});

	expect(builtIn.text).toContain("show the branch");
	expect(builtIn.text).not.toBe(stock);
	expect(own.text).toBe(stock);
});

test("the /statusline edit text names settings.json under CLAUDE_CONFIG_DIR, else under HOME", async ($: Engine, on: On) => {
	const state = lab(on);
	on("skill.prompt", (_$, e) => e);
	const stock = 'Create a status line with the prompt "x"';
	const ask = () =>
		$.skill.prompt({ skill: "statusline", text: stock, source: "built-in" });

	const awaited = await ask();
	expect(awaited.text).toBe(
		statuslineEdit(stock, "/home/u/.claude/settings.json"),
	);
	state.env = { CLAUDE_CONFIG_DIR: "/cfg/alt/" };

	const awaited2 = await ask();
	expect(awaited2.text).toBe(statuslineEdit(stock, "/cfg/alt/settings.json"));
});

test("a typed Context7 key is written to settings env and the report does not repeat it", async ($: Engine, on: On) => {
	const state = lab(on, "{}", () => "Skip");
	state.key = "ctx7sk-secret";

	const out = await run($, "claudetto:setup");

	expect(saved(state)["env"]).toEqual({ CONTEXT7_API_KEY: "ctx7sk-secret" });
	expect(out.text).toContain("CONTEXT7_API_KEY");
	expect(out.text).not.toContain("ctx7sk-secret");
});

test("a Context7 key already in settings env is the user's: not asked, not replaced", async ($: Engine, on: On) => {
	const state = lab(on, '{"env":{"CONTEXT7_API_KEY":"mine"}}');
	state.key = "other";

	await run($, "claudetto:setup");

	expect(asked(state, "Context7")).toEqual([]);
	expect(JSON.stringify(saved(state))).toContain('"CONTEXT7_API_KEY":"mine"');
});

test("a skipped Context7 key writes nothing", async ($: Engine, on: On) => {
	const state = lab(on, "{}", () => "Skip");

	await run($, "claudetto:setup");

	expect(asked(state, "Context7")).toHaveLength(1);
	expect(JSON.stringify(saved(state))).not.toContain("CONTEXT7_API_KEY");
});
