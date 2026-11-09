import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { unguarded } from "./gate/walled.ts";
import { scanned } from "./secrets.mock.ts";
import { valueAt } from "./setup/settings.ts";

const FILE = "/home/u/.claude/settings.json";

interface Written {
	path: string;
	text: string;
}

interface Lab {
	readonly files: Map<string, string>;
	readonly mtimes: Map<string, number>;
	readonly written: Written[];
	readonly shown: string[];
	/** Each header, option label, and option description a dialog drew. */
	readonly drawn: string[];
	readonly logs: string[];
	readonly store: Map<string, unknown>;
	readonly runs: (readonly string[])[];
	/** The answer to the Context7 key dialog; `Skip` unless a test types a key. */
	key: string;
	/** The `PATH` the hooks see. */
	path: string | undefined;
	/** The variables the hooks see besides `HOME` and `PATH`. */
	env: Record<string, string>;
}

/** A home at /home/u whose settings file holds `held`, `pick` answering each dialog with its question text. */
const lab = (
	on: On,
	held: string | undefined,
	pick: (question: string, options: readonly string[]) => string = () =>
		"Write",
	git: (argv: readonly string[]) => string = () => "",
	failWrites = false,
	version = "2.1.318",
): Lab => {
	const state: Lab = {
		files: new Map(held === undefined ? [] : [[FILE, held]]),
		mtimes: new Map(),
		written: [],
		shown: [],
		drawn: [],
		logs: [],
		store: new Map(),
		runs: [],
		key: "Skip",
		path: undefined,
		env: {},
	};
	on("env.get", (_$, e) => ({
		value: { HOME: "/home/u", PATH: state.path, ...state.env }[e.name],
	}));
	on("fs.exists", (_$, e) => ({ value: state.files.has(e.path) }));
	on("fs.read", (_$, e) => {
		const text = state.files.get(e.path);
		if (text === undefined) {
			throw new Error("no file");
		}
		return { value: text };
	});
	on("fs.stat", (_$, e) => ({
		value: {
			kind: "file",
			size: 0,
			mtimeMs: state.mtimes.get(e.path) ?? 0,
			isLink: false,
		},
	}));
	on("fs.write", (_$, e) => {
		if (failWrites) {
			throw new Error("disk full");
		}
		state.written.push({ path: e.path, text: e.text });
		state.files.set(e.path, e.text);
		return { value: undefined };
	});
	on("process.run", (_$, e) => {
		const scan = scanned(e);
		if (scan) {
			return scan;
		}
		state.runs.push(e.argv);
		return {
			value: {
				stdout: git(e.argv),
				stderr: "",
				exitCode: 0,
				isStdoutTruncated: false,
				isStderrTruncated: false,
			},
		};
	});
	on("store.get", (_$, e) => ({ value: state.store.get(e.key) }));
	on("store.set", (_$, e) => {
		state.store.set(e.key, e.value);
		return { value: undefined };
	});
	on("clock.now", () => ({ value: 0 }));
	on("session.version", () => ({
		value: { version, base: version, builtAt: "2026-10-30T00:00:00Z" },
	}));
	on("classic.SessionStart", () => ({}));
	on("command.describe", (_$, e) => ({
		description: e.description,
		isHidden: false,
	}));
	on("session.cwd", () => ({ value: "/p" }));
	on("ui.log", (_$, e) => {
		state.logs.push(e.text);
		return { value: undefined };
	});
	on("tool.call", (_$, e, next) => {
		if (e.tool !== "AskUserQuestion") {
			return next(e);
		}
		const [first] =
			"questions" in e && Array.isArray(e.questions) ? e.questions : [];
		const question = String(first?.question);
		const options: string[] = (first?.options ?? []).map(
			(o: { label: string }) => o.label,
		);
		state.shown.push(question);
		state.drawn.push(
			String(first?.header ?? ""),
			...(first?.options ?? []).flatMap(
				(o: { label: string; description?: string }) => [
					o.label,
					o.description ?? "",
				],
			),
		);
		const answer = question.startsWith("Context7")
			? state.key
			: pick(question, options);
		return { result: { answers: { [question]: answer } } };
	});
	return state;
};

const run = async ($: Engine, command: string, args = "") =>
	await $.command.run({
		command,
		args,
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 },
	});

const saved = (state: Lab): Record<string, unknown> => {
	const last = state.written.find((w) => w.path === FILE);
	return last === undefined ? {} : JSON.parse(last.text);
};

test("setup on an empty file writes the telemetry env and the eight denies and no Agent deny", async ($: Engine, on: On) => {
	const state = lab(on, undefined);

	const out = await run($, "claudetto:setup");
	const text = JSON.stringify(saved(state));

	expect(out.text).toContain("Wrote");
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
	const state = lab(on, undefined);
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
		const state = lab(on, undefined);

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
	const state = lab(on, undefined);

	await run($, "claudetto:setup");

	expect(valueAt(saved(state), ["permissions", "deny"])).toContain(
		"Read(~/.claudetto-holdout/**)",
	);
});

test(
	"with no protected path, setup writes no Read deny",
	{ options: { protectedPaths: [] } },
	async ($: Engine, on: On) => {
		const state = lab(on, undefined);

		await run($, "claudetto:setup");

		expect(JSON.stringify(saved(state))).not.toContain("Read(");
	},
);

test("a settings file that is not a JSON object is left as it is", async ($: Engine, on: On) => {
	const state = lab(on, "[1");

	const out = await run($, "claudetto:setup");

	expect(state.written).toEqual([]);
	expect(out.text).toContain("could not be read");
});

test("a dismissed dialog writes nothing and says so", async ($: Engine, on: On) => {
	const state = lab(on, "{}", () => {
		throw new Error("dismissed");
	});

	const out = await run($, "claudetto:setup");

	expect(state.written.filter((w) => w.path === FILE)).toEqual([]);
	expect(out.text).toContain("Nothing was written");
});

test("a Skip on every group writes no settings file", async ($: Engine, on: On) => {
	const state = lab(on, "{}", () => "Skip");

	await run($, "claudetto:setup");

	expect(state.written.filter((w) => w.path === FILE)).toEqual([]);
});

test("a second run with everything in place asks nothing and writes nothing", async ($: Engine, on: On) => {
	const state = lab(on, undefined);
	await run($, "claudetto:setup");
	const writes = state.written.length;
	const asked = state.shown.filter((q) => !q.startsWith("Context7")).length;

	await run($, "claudetto:setup");

	expect(state.written).toHaveLength(writes);
	expect(state.shown.filter((q) => !q.startsWith("Context7"))).toHaveLength(
		asked,
	);
});

test("the ignore dialog says it narrows Grep and not Glob", async ($: Engine, on: On) => {
	const state = lab(
		on,
		"{}",
		() => "Skip",
		(argv) => (argv.includes("rev-parse") ? "true\n" : ""),
	);

	await run($, "claudetto:setup");

	const ignore = state.shown.find((q) => q.includes("Grep"));
	expect(ignore).toBeDefined();
	expect(ignore).toContain("narrows `Grep`");
	expect(ignore).toContain("and not `Glob`");
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

	const out = await run($, "statusline");

	expect(state.written).toEqual([]);
	expect(out.text).toContain("stays as it is");
});

test("/statusline run twice writes the file once", async ($: Engine, on: On) => {
	const state = lab(on, "{}");
	await run($, "statusline");

	const out = await run($, "statusline");

	expect(state.written).toHaveLength(1);
	expect(out.text).toContain("already");
});

test("/statusline on a file that is not a JSON object writes nothing and names it", async ($: Engine, on: On) => {
	const state = lab(on, "nope");

	const out = await run($, "statusline");

	expect(state.written).toEqual([]);
	expect(out.text).toContain(FILE);
});

test("a /statusline write that fails says so", async ($: Engine, on: On) => {
	lab(on, "{}", undefined, undefined, true);

	const out = await run($, "statusline");

	expect(out.text).toContain("Could not write");
});

test("/statusline with text goes on to the built-in command", async ($: Engine, on: On) => {
	lab(on, "{}");
	on("command.run", () => ({ text: "built-in" }));

	const out = await run($, "statusline", "show the branch");

	expect(out.text).toBe("built-in");
});

test("/statusline is described as making no model call", async ($: Engine, on: On) => {
	lab(on, undefined);
	const described = await $.command.describe({
		command: "statusline",
		description: "stock",
		isHidden: false,
		immediate: false,
		provider: { plugin: "claude-code", tier: "core" },
	});

	expect(described.description).not.toBe("stock");
});

test("a startup below the version floor logs a line naming claude update", async ($: Engine, on: On) => {
	const state = lab(on, undefined, undefined, undefined, false, "2.1.311");

	await $.classic.SessionStart({ source: "startup" });

	expect(
		state.logs.some(
			(l) => l.includes("claude update") && l.includes("2.1.318"),
		),
	).toBe(true);
});

test("the floor itself logs nothing about the version", async ($: Engine, on: On) => {
	const state = lab(on, undefined, undefined, undefined, false, "2.1.318");

	await $.classic.SessionStart({ source: "startup" });

	expect(state.logs.some((l) => l.includes("claude update"))).toBe(false);
});

test("a startup below the version floor logs exactly one line, naming both versions", async ($: Engine, on: On) => {
	const older = lab(on, undefined, undefined, undefined, false, "2.1.317");

	await $.classic.SessionStart({ source: "startup" });

	const lines = older.logs.filter((l) => l.includes("claude update"));
	expect(lines).toHaveLength(1);
	expect(lines[0]).toContain("2.1.317");
	expect(lines[0]).toContain("2.1.318");
});

test("a startup without ast-grep logs one notice, and the second logs none", async ($: Engine, on: On) => {
	const state = lab(on, undefined);

	await $.classic.SessionStart({ source: "startup" });
	const first = state.logs.filter((l) => l.includes("ast-grep")).length;
	await $.classic.SessionStart({ source: "startup" });
	const second = state.logs.filter((l) => l.includes("ast-grep")).length;

	expect(first).toBe(1);
	expect(second).toBe(1);
});

/** The plugin root the lab's hooks see: the folder above hooks/. */
const ROOT = import.meta.dir.replace(/\/hooks$/, "");
const CONFIG = "/home/u/.claude";
const RULE_NAMES = [
	"useLeastCode",
	"noUnrequestedEdits",
	"noImpossibleStateGuards",
	"useEdgeCaseReport",
	"noNarratingComments",
];
const shippedPath = (name: string) => `${ROOT}/rules/${name}.md`;
const installedPath = (name: string) => `${CONFIG}/rules/claudetto/${name}.md`;
const shippedText = (name: string) =>
	`---\npaths:\n  - "**/*"\n---\n\nRule ${name}.`;

/** A lab whose plugin ships every rule, with `pick` answering the dialogs. */
const rulesLab = (
	on: On,
	pick: (question: string) => string = () => "Write",
): Lab => {
	const state = lab(on, "{}", (question) => pick(question));
	for (const name of RULE_NAMES) {
		state.files.set(shippedPath(name), shippedText(name));
	}
	return state;
};

const ruleDialogs = (state: Lab) =>
	state.shown.filter((q) => q.startsWith("Copy the "));

const startup = async ($: Engine) =>
	await $.classic.SessionStart({ source: "startup" });

const ruleLogs = (state: Lab) =>
	state.logs.filter((l) => l.includes(" rule is "));

test("each rule the user lacks is a dialog of its own", async ($: Engine, on: On) => {
	const state = rulesLab(on, () => "Skip");

	await run($, "claudetto:setup");

	const asked = ruleDialogs(state);
	expect(asked).toHaveLength(RULE_NAMES.length);
	for (const name of RULE_NAMES) {
		expect(
			asked.filter((q) => q.startsWith(`Copy the ${name} rule`)),
		).toHaveLength(1);
	}
});

test("a rule the user already holds is not offered", async ($: Engine, on: On) => {
	const state = rulesLab(on);
	state.files.set(installedPath("useLeastCode"), shippedText("useLeastCode"));

	await run($, "claudetto:setup");

	expect(ruleDialogs(state)).toHaveLength(RULE_NAMES.length - 1);
	expect(ruleDialogs(state).some((q) => q.includes("useLeastCode"))).toBe(
		false,
	);
});

test("Write puts the shipped text under rules/claudetto and writes no settings key", async ($: Engine, on: On) => {
	const state = rulesLab(on, (q) =>
		q.startsWith("Copy the ") ? "Write" : "Skip",
	);

	const out = await run($, "claudetto:setup");

	for (const name of RULE_NAMES) {
		expect(state.files.get(installedPath(name))).toBe(shippedText(name));
		expect(out.text).toContain(`Wrote ${installedPath(name)}`);
	}
	expect(state.written.filter((w) => w.path === FILE)).toEqual([]);
});

test("a dismissed rule dialog stops the rest and says so", async ($: Engine, on: On) => {
	const state = rulesLab(on, (q) => {
		if (q.startsWith("Copy the noUnrequestedEdits")) {
			throw new Error("dismissed");
		}
		return q.startsWith("Copy the ") ? "Write" : "Skip";
	});

	const out = await run($, "claudetto:setup");

	expect(ruleDialogs(state)).toHaveLength(2);
	expect(state.files.has(installedPath("useLeastCode"))).toBe(true);
	expect(state.files.has(installedPath("noUnrequestedEdits"))).toBe(false);
	expect(state.files.has(installedPath("noImpossibleStateGuards"))).toBe(false);
	expect(out.text).toContain("Wrote no further rules");
});

test("a shipped rule changed after setup wrote it is logged as updated, once", async ($: Engine, on: On) => {
	const state = rulesLab(on);
	await run($, "claudetto:setup");
	state.files.set(shippedPath("useLeastCode"), "new text");
	state.mtimes.set(shippedPath("useLeastCode"), Date.UTC(2026, 10, 6));

	await startup($);
	await startup($);

	const logs = ruleLogs(state);
	expect(logs).toHaveLength(1);
	expect(logs[0]).toContain("useLeastCode rule is updated");
	expect(logs[0]).toContain("2026-11-06");
	expect(logs[0]).toContain("/claudetto:setup");
});

test("an edited copy is logged as modified even when the shipped file has the newer date", async ($: Engine, on: On) => {
	const state = rulesLab(on);
	await run($, "claudetto:setup");
	state.files.set(installedPath("useLeastCode"), "mine");
	state.mtimes.set(installedPath("useLeastCode"), Date.UTC(2026, 0, 1));
	state.mtimes.set(shippedPath("useLeastCode"), Date.UTC(2026, 10, 6));

	await startup($);

	const logs = ruleLogs(state);
	expect(logs).toHaveLength(1);
	expect(logs[0]).toContain("useLeastCode rule is modified");
});

test("a copy with no saved hash that differs is logged as modified", async ($: Engine, on: On) => {
	const state = rulesLab(on);
	state.files.set(installedPath("useLeastCode"), "old");

	await startup($);

	expect(ruleLogs(state).join()).toContain("useLeastCode rule is modified");
});

test("an unchanged copy logs nothing", async ($: Engine, on: On) => {
	const state = rulesLab(on);
	await run($, "claudetto:setup");

	await startup($);

	expect(ruleLogs(state)).toEqual([]);
});

test("a rule never installed logs nothing", async ($: Engine, on: On) => {
	const state = rulesLab(on);

	await startup($);

	expect(ruleLogs(state)).toEqual([]);
});

const GO_REPO = (argv: readonly string[]) =>
	argv.includes("rev-parse") ? "true\n" : "go.mod\nmain.go\n";
const asked = (state: Lab, word: string) =>
	state.shown.filter((q) => q.includes(word));
const writtenAt = (state: Lab, path: string) =>
	state.written.find((w) => w.path === path)?.text;

test("session.start registers no setup tool", async ($: Engine, on: On) => {
	lab(on, undefined);
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
	lab(on, undefined);

	const out = await run($, "claudetto:setup");

	expect(out.text).toContain("Wrote");
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
	expect(sizes.every((n) => n >= 2 && n <= 4)).toBe(true);
});

/** A character the dialog draws as `�` in a label or description: a C0 or C1 control other than tab, or a line or paragraph separator. */
const isUndrawn = (text: string): boolean =>
	[...text].some((c) => {
		const n = c.codePointAt(0) ?? 0;
		return (
			(n < 32 && n !== 9) ||
			(n >= 127 && n < 160) ||
			n === 0x20_28 ||
			n === 0x20_29
		);
	});

test("no dialog header, label, or description holds a character drawn as `�`", async ($: Engine, on: On) => {
	const state = lab(on, "{}", undefined, GO_REPO);

	await run($, "claudetto:setup");

	expect(state.shown.length).toBeGreaterThan(3);
	expect(state.drawn.filter(isUndrawn)).toEqual([]);
});

test("only the chosen group is written to the user settings file", async ($: Engine, on: On) => {
	const state = lab(on, "{}", (q) =>
		q.startsWith("Starts a worktree") ? "Write" : "Skip",
	);

	await run($, "claudetto:setup");

	expect(saved(state)).toEqual({ worktree: { baseRef: "head" } });
});

test("the setup report names the groups written and gives no share of a limit", async ($: Engine, on: On) => {
	lab(on, undefined);

	const out = await run($, "claudetto:setup");

	expect(out.text).toContain("Wrote Smaller prompt");
	expect(out.text).not.toContain("%");
});

test("a clean write holds each planned key, only in the settings file, and no subagentStatusLine", async ($: Engine, on: On) => {
	const state = lab(on, undefined);

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
	const state = lab(on, undefined);

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
		(q) => {
			if (q.includes("Write these files")) {
				state.files.set("/p/AGENTS.md", "mine");
			}
			return "Write";
		},
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

test("a Yes shows the brew command and then runs it", async ($: Engine, on: On) => {
	const state = lab(on, "{}", (q) => (q.includes("brew") ? "Yes" : "Skip"));
	state.path = "/bin";
	state.files.set("/bin/brew", "");

	await run($, "claudetto:setup");

	expect(asked(state, "brew install ast-grep")).toHaveLength(1);
	expect(state.runs).toContainEqual(["brew", "install", "ast-grep"]);
});

test("a No runs nothing and records the decline", async ($: Engine, on: On) => {
	const state = lab(on, "{}", (q) => (q.includes("brew") ? "No" : "Skip"));
	state.path = "/bin";
	state.files.set("/bin/brew", "");

	await run($, "claudetto:setup");

	expect(state.runs).not.toContainEqual(["brew", "install", "ast-grep"]);
	expect(state.store.get("optional-tool:ast-grep")).toBe(true);
});

test("a startup without betterleaks logs its notice every time, and records nothing", async ($: Engine, on: On) => {
	const state = lab(on, undefined);
	state.path = "/bin";
	state.files.set("/bin/brew", "");

	await $.classic.SessionStart({ source: "startup" });
	await $.classic.SessionStart({ source: "startup" });

	const notices = state.logs.filter((l) => l.includes("`betterleaks`"));
	expect(notices).toHaveLength(2);
	expect(notices[0]).toContain("brew install betterleaks");
	expect(state.store.has("optional-tool:betterleaks")).toBe(false);
});

test("a No to betterleaks records nothing and names the install step", async ($: Engine, on: On) => {
	const state = lab(on, "{}", (q) => (q.includes("brew") ? "No" : "Skip"));
	state.path = "/bin";
	state.files.set("/bin/brew", "");

	const out = await run($, "claudetto:setup");

	expect(state.runs).not.toContainEqual(["brew", "install", "betterleaks"]);
	expect(state.store.has("optional-tool:betterleaks")).toBe(false);
	expect(out.text).toContain("Run `brew install betterleaks` to fix it.");
});

test("a dismissed install question runs nothing and records nothing", async ($: Engine, on: On) => {
	const state = lab(on, "{}", (q) => {
		if (q.includes("brew")) {
			throw new Error("dismissed");
		}
		return "Skip";
	});
	state.path = "/bin";
	state.files.set("/bin/brew", "");

	await run($, "claudetto:setup");

	expect(state.runs).not.toContainEqual(["brew", "install", "ast-grep"]);
	expect(state.store.has("optional-tool:ast-grep")).toBe(false);
});

test("a platform with no package manager gets the releases page, and nothing runs", async ($: Engine, on: On) => {
	const state = lab(on, "{}");
	state.path = "/bin";

	const out = await run($, "claudetto:setup");

	expect(out.text).toContain("https://github.com/ast-grep/ast-grep/releases");
	expect(asked(state, "brew")).toEqual([]);
	expect(state.runs.filter((argv) => argv[0] === "brew")).toEqual([]);
});

test("ast-grep on the PATH asks and says nothing", async ($: Engine, on: On) => {
	const state = lab(on, "{}");
	state.path = "/bin";
	state.files.set("/bin/ast-grep", "");

	const out = await run($, "claudetto:setup");

	expect(asked(state, "ast-grep")).toEqual([]);
	expect(out.text).not.toContain("ast-grep");
});

test("the startup notice names the install command and /claudetto:setup", async ($: Engine, on: On) => {
	const state = lab(on, undefined);
	state.path = "/bin";
	state.files.set("/bin/brew", "");

	await startup($);

	const [line] = state.logs.filter((l) => l.includes("ast-grep"));
	expect(line).toContain("brew install ast-grep");
	expect(line).toContain("/claudetto:setup");
});

test("ast-grep on the PATH logs nothing at startup", async ($: Engine, on: On) => {
	const state = lab(on, undefined);
	state.path = "/bin";
	state.files.set("/bin/ast-grep", "");

	await startup($);

	expect(state.logs.filter((l) => l.includes("ast-grep"))).toEqual([]);
});

test("a resume logs neither the notice nor the version", async ($: Engine, on: On) => {
	const state = lab(on, undefined, undefined, undefined, false, "2.1.311");

	await $.classic.SessionStart({ source: "resume" });

	expect(state.logs.filter((l) => l.includes("claude update"))).toEqual([]);
	expect(state.logs.filter((l) => l.includes("ast-grep"))).toEqual([]);
});

const FLOOR_CASES: [string, boolean][] = [
	["2.1.315", true],
	["2.1.311-dev", true],
	["2.1.320", false],
	["2.1.1000", false],
	["2.2.0", false],
	["3.0.0", false],
	["dev", false],
];
for (const [version, warns] of FLOOR_CASES) {
	test(`${version} at startup ${warns ? "warns" : "adds no line"}, compared by numeric parts`, async ($: Engine, on: On) => {
		const state = lab(on, undefined, undefined, undefined, false, version);

		await startup($);

		expect(state.logs.some((l) => l.includes("claude update"))).toBe(warns);
	});
}

test("setup writes the same minimumVersion that the startup floor warns on", async ($: Engine, on: On) => {
	const state = lab(on, undefined, undefined, undefined, false, "2.1.315");

	await run($, "claudetto:setup");
	await startup($);

	const floor = saved(state)["minimumVersion"];
	expect(floor).toBe("2.1.318");
	expect(state.logs.some((l) => l.includes(String(floor)))).toBe(true);
});

test("the built-in /statusline prompt is replaced, and a user's own skill keeps its text", async ($: Engine, on: On) => {
	lab(on, undefined);
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
	const state = lab(on, undefined);
	on("skill.prompt", (_$, e) => e);
	const ask = () =>
		$.skill.prompt({
			skill: "statusline",
			text: 'Create a status line with the prompt "x"',
			source: "built-in",
		});

	expect((await ask()).text).toContain("Read @/home/u/.claude/settings.json.");
	state.env = { CLAUDE_CONFIG_DIR: "/cfg/alt/" };

	expect((await ask()).text).toContain("Read @/cfg/alt/settings.json.");
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

test("the hooks runtime computes SHA-256 as the setup hash needs it", async () => {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode("abc").slice(),
	);

	expect(
		Array.from(new Uint8Array(digest), (b) =>
			b.toString(16).padStart(2, "0"),
		).join(""),
	).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

const MOLE_FILE = "/home/u/.config/mole/purge_paths";
const DF_HEAD = "Filesystem 1024-blocks Used Available Capacity Mounted on\n";
const moleLab = (on: On, df = "", root = "/p") => {
	const state = lab(
		on,
		"{}",
		() => "Skip",
		(argv) => {
			if (argv[0] === "df") {
				return df;
			}
			return argv.includes("--show-toplevel") ? `${root}\n` : "";
		},
	);
	state.path = "/bin";
	state.files.set("/bin/mo", "");
	return state;
};

test("a startup without Mole logs its install notice every time, and a No to it names the install step", async ($: Engine, on: On) => {
	const state = lab(on, "{}", (q) => (q.includes("brew") ? "No" : "Skip"));
	state.path = "/bin";
	state.files.set("/bin/brew", "");

	await startup($);
	await startup($);
	const out = await run($, "claudetto:setup");

	expect(state.logs.filter((l) => l.includes("brew install mole"))).toHaveLength(2);
	expect(state.runs).not.toContainEqual(["brew", "install", "mole"]);
	expect(out.text).toContain("Run `brew install mole` to fix it.");
});

test("setup adds the project root to Mole's purge_paths once, keeping what the file held", async ($: Engine, on: On) => {
	const state = moleLab(on);
	state.files.set(MOLE_FILE, "# Mole Purge Paths\n~/Library/CloudStorage");

	const first = await run($, "claudetto:setup");
	const second = await run($, "claudetto:setup");

	expect(state.files.get(MOLE_FILE)).toBe("# Mole Purge Paths\n~/Library/CloudStorage\n/p\n");
	expect(first.text).toContain(`Added /p to ${MOLE_FILE}`);
	expect(second.text).not.toContain("purge_paths");
});

test("a purge_paths entry holding the project, written with ~, adds nothing", async ($: Engine, on: On) => {
	const state = moleLab(on, "", "/home/u/code/p");
	state.files.set(MOLE_FILE, "~/code\n");

	await run($, "claudetto:setup");

	expect(state.written.filter((w) => w.path === MOLE_FILE)).toEqual([]);
});

test("a disk over 80% full logs its free space and both Mole previews", async ($: Engine, on: On) => {
	const full = moleLab(on, `${DF_HEAD}/dev/disk3s5 482000000 395000000 47185920 81% /System/Volumes/Data\n`);

	await startup($);

	expect(full.logs.filter((l) => l.includes("% full"))).toEqual([
		"The disk holding this project is 81% full, 45.0 GiB free. Preview what Mole would remove: `! mo clean --dry-run` for caches, `! mo purge --dry-run` for build folders.",
	]);
});

test("a disk at 80% full logs no disk line", async ($: Engine, on: On) => {
	const state = moleLab(on, `${DF_HEAD}/dev/disk3s5 482000000 385000000 97000000 80% /System/Volumes/Data\n`);

	await startup($);

	expect(state.logs.filter((l) => l.includes("% full"))).toEqual([]);
});
