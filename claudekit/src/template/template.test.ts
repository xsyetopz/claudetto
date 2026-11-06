import { beforeAll, describe, expect, test } from "bun:test";
import { copyFile, readdir, symlink } from "node:fs/promises";
import { join } from "node:path";
import { assertArm } from "../arm/arm.ts";
import { mainRequests, readRequests, type SavedRequest, startFake } from "../fake/fake.ts";
import { claudeVersion, launch, launchEnv, runFiles } from "../launcher/launcher.ts";
import { DEFAULT_MODEL } from "../shared/model.ts";
import { tempDir } from "../shared/temp.ts";
import { createRun } from "../workspace/workspace.ts";
import { templateCommand } from "./command.ts";
import { checkHooks, engineTypes } from "./engine-types.ts";
import { KINDS, type Kind, PLUGIN_KINDS, render, renderKind, variables } from "./template.ts";

const UNSET = /unset variables: first, second/;
const EXISTS = /files exist: .*plugin\.json/;
const UNKNOWN_KIND = /kind "nope": unknown/;
const BAD_PAIR = /not NAME=VALUE/;
const CLASSIC_CONTEXT = "CLASSIC-CONTEXT-7f3a";
const MOD_CONTEXT = "MOD-CONTEXT-2c9e";
const TOOL_ANSWER = "TOOL-ANSWER-91d0";
const OUTPUT_STYLE = "stylep:Terse";
// `blocks` must be an array of `{ name, text }`; a string is the shape a careless hook returns.
const BAD_HOOK = `import type { On } from "claude-code";
export const register = (on: On): void => {
	on("prompt.context", async (_$, e, next) => ({ ...(await next(e)), blocks: "x" }));
};
`;
const KIT_SRC = join(import.meta.dir, "..");
// The kit installs no packages of its own; `bun-types` resolves from the repository root.
const ROOT_MODULES = join(KIT_SRC, "..", "..", "node_modules");

const VARS: Record<Kind, Record<string, string>> = {
	"classic-hook": { plugin: "classicp", description: "Adds context.", context: CLASSIC_CONTEXT },
	"mod-hook": { plugin: "modp", description: "Adds a block.", context: MOD_CONTEXT },
	"output-style": { plugin: "stylep", description: "Short.", style: "Terse", instructions: "Answer in one line." },
	agent: { plugin: "agentp", description: "Reads.", agent: "reader", tools: "Read", instructions: "Read the file." },
	skill: { plugin: "skillp", description: "Greets.", skill: "greet", instructions: "Say hello." },
	command: { plugin: "cmdp", description: "Lists.", command: "list", instructions: "List the files." },
	"mcp-tool": { plugin: "toolp", description: "Echoes.", tool: "echo", answer: TOOL_ANSWER },
	settings: { plugin: "stylep", outputStyle: OUTPUT_STYLE },
	probe: { probe: "demo", pluginDir: "/plugin", pluginName: "demo", prompt: "hi" },
};

const fileCount = async (dir: string): Promise<number> =>
	(await readdir(dir, { recursive: true, withFileTypes: true })).filter((e) => e.isFile()).length;

describe("render", () => {
	test("inserts a raw value and a JSON-quoted value", () => {
		expect(render("{{a}} = {{json a}}", { a: 'say "hi"' })).toBe('say "hi" = "say \\"hi\\""');
	});

	test("lists every unset variable", () => {
		expect(() => render("{{first}} {{ json second }} {{first}}", {})).toThrow(UNSET);
	});
});

describe("renderKind", () => {
	test("each kind names the variables its files use", async () => {
		expect(await variables("agent")).toEqual(["agent", "description", "instructions", "plugin", "tools"]);
		for (const kind of KINDS) {
			expect(await variables(kind)).toEqual(Object.keys(VARS[kind]).sort());
		}
	});

	test("a description with quotes and a colon stays one JSON string", async () => {
		const out = await tempDir("tpl");
		const description = 'Says "hi": then \\ stops.';
		await renderKind("command", { ...VARS.command, description }, out);
		const manifest = await Bun.file(join(out, ".claude-plugin", "plugin.json")).json();
		expect(manifest.description).toBe(description);
	});

	test("an unset variable or an existing file writes nothing", async () => {
		const out = await tempDir("tpl");
		await expect(renderKind("skill", { plugin: "x" }, out)).rejects.toThrow("unset variables: description, instructions, skill");
		expect(await fileCount(out)).toBe(0);
		await renderKind("skill", VARS.skill, out);
		const before = await fileCount(out);
		await expect(renderKind("agent", VARS.agent, out)).rejects.toThrow(EXISTS);
		expect(await fileCount(out)).toBe(before);
	});
});

describe("templateCommand", () => {
	test("renders from --var pairs and refuses a bad kind or pair", async () => {
		const out = await tempDir("tpl-cli");
		const vars = Object.entries(VARS.skill).flatMap(([k, v]) => ["--var", `${k}=${v}`]);
		expect(await templateCommand(["render", "skill", out, ...vars])).toContain("SKILL.md");
		await expect(templateCommand(["vars", "nope"])).rejects.toThrow(UNKNOWN_KIND);
		await expect(templateCommand(["render", "skill", out, "--var", "oops"])).rejects.toThrow(BAD_PAIR);
		expect(await templateCommand([])).toContain("--var NAME=VALUE");
	});
});

describe("the probe skeleton", () => {
	test("type-checks against the kit and runs both arms against the fake", async () => {
		const out = await tempDir("tpl-probe");
		await symlink(KIT_SRC, join(out, "src"));
		await symlink(ROOT_MODULES, join(out, "node_modules"));
		await copyFile(join(KIT_SRC, "..", "tsconfig.json"), join(out, "tsconfig.json"));
		await renderKind("mod-hook", VARS["mod-hook"], join(out, "plugin"));
		await renderKind("probe", { ...VARS.probe, pluginDir: join(out, "plugin"), pluginName: "modp" }, out);
		const run = async (argv: string[]) => {
			const p = Bun.spawn(argv, { cwd: out, stdout: "pipe", stderr: "pipe" });
			return { code: await p.exited, out: await new Response(p.stdout).text() };
		};
		expect((await run(["bun", "check"])).code).toBe(0);
		expect((await run(["bun", "probes/demo/probe.ts"])).out).toContain("plan: 6 sessions");
		const report = JSON.parse((await run(["bun", "probes/demo/probe.ts", "--run"])).out.replace(/^run .*\n/gm, ""));
		expect(report.rejected).toEqual([]);
		expect(report.cases[0].byArm.plugin.n).toBe(3);
	}, 120_000);
});

describe("hooks type-check against the engine's own declarations", () => {
	let types = "";

	beforeAll(async () => {
		types = join(await tempDir("tpl-types"), "claude-code.d.ts");
		const first = await engineTypes(types);
		expect(first.written).toBe(true);
	}, 120_000);

	test("the declarations name the installed version, and a second call keeps them", async () => {
		const version = await claudeVersion(launchEnv({}, { config: "" }, process.env));
		expect((await Bun.file(types).text()).split("\n")[0]).toBe(`// Written by Claude Code ${version}.`);
		expect(await engineTypes(types)).toEqual({ path: types, version, written: false });
	});

	test("the rendered Mod hook and MCP tool pass, and a hook with a wrong answer fails", async () => {
		const out = await tempDir("tpl-hooks");
		await renderKind("mod-hook", VARS["mod-hook"], join(out, "mod"));
		await renderKind("mcp-tool", VARS["mcp-tool"], join(out, "tool"));
		const good = await checkHooks([join(out, "mod"), join(out, "tool")], types);
		expect(good).toEqual({ ok: true, output: expect.any(String) });
		await Bun.write(join(out, "bad", "hooks", "register.ts"), BAD_HOOK);
		const bad = await checkHooks([join(out, "bad")], types);
		expect(bad.ok).toBe(false);
		expect(bad.output).toContain("register.ts");
		const cwd = process.cwd();
		process.chdir(out);
		try {
			expect((await checkHooks(["bad"], types)).ok).toBe(false);
		} finally {
			process.chdir(cwd);
		}
		await Bun.write(join(out, "nothing", "hooks", "hooks.json"), "{}");
		await expect(checkHooks([join(out, "nothing")], types)).rejects.toThrow(/no \.ts file under/);
	}, 60_000);
});

describe("every plugin kind loads in a real claude -p", () => {
	let requests: SavedRequest[] = [];
	let debugLog = "";

	beforeAll(async () => {
		const root = await tempDir("tpl-load");
		const pluginDirs = await Promise.all(
			PLUGIN_KINDS.map(async (kind) => {
				const dir = join(root, kind);
				await renderKind(kind, VARS[kind], dir);
				return dir;
			}),
		);
		const run = await createRun({ probe: "template", root, quiet: true });
		const dir = join(run.dir, "requests");
		const fake = await startFake({
			plan: {
				steps: [{ reply: { blocks: [{ type: "tool_use", name: "mcp__toolp__echo", input: { text: "x" } }], stop: "tool_use" } }],
				fallback: { blocks: [{ type: "text", text: "Done." }] },
			},
			dir,
		});
		try {
			await launch(
				{
					prompt: "hi",
					mode: "stream-json",
					model: DEFAULT_MODEL,
					baseUrl: fake.url,
					pluginDirs,
					settings: { outputStyle: OUTPUT_STYLE },
					flags: ["--allowedTools", "mcp__toolp__echo"],
				},
				run,
			);
		} finally {
			await fake.stop();
		}
		requests = mainRequests(await readRequests(dir));
		debugLog = await Bun.file(runFiles(run).debug).text();
	}, 120_000);

	test("the arm assertion sees each plugin, its parts, and the registered tool", () => {
		const check = assertArm(
			{
				plugins: PLUGIN_KINDS.map((k) => VARS[k].plugin as string),
				agents: { agentp: 1 },
				skills: { skillp: 1 },
				commands: { cmdp: 1 },
				hookEvents: { "modp@inline": ["prompt.context"], "toolp@inline": ["session.start", "tool.call"] },
				outputStyle: OUTPUT_STYLE,
				toolsInclude: ["mcp__toolp__echo"],
			},
			{ debugLog, firstRequest: requests[0]?.body },
		);
		expect(check.diff).toEqual([]);
	});

	test("the classic and the Mod hook each add their context to the first request", () => {
		const first = JSON.stringify(requests[0]?.body);
		expect(first).toContain(CLASSIC_CONTEXT);
		expect(first).toContain(MOD_CONTEXT);
	});

	test("the registered tool answers the model's call", () => {
		expect(requests.length).toBeGreaterThanOrEqual(2);
		expect(JSON.stringify(requests[1]?.body)).toContain(TOOL_ANSWER);
	});
});
