import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	chmod,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { file, spawn } from "bun";
import { denyRulesOf, refusedPaths } from "../keys.ts";
import { settingsText } from "../merge.ts";
import { parseArgs, planSetup } from "../setup.ts";
import { tierSnippet } from "../snippet.ts";
import { SNIPPET_ROW, TIERS } from "../tiers.ts";

const PLATFORM = "darwin";

const MAX_20X = {
	oauthAccount: { organizationRateLimitTier: "default_claude_max_20x" },
};
const SCRIPT = join(import.meta.dir, "..", "setup.ts");

describe("parseArgs", () => {
	test("no argument means a real run at the default file", () => {
		const argv: string[] = [];

		const args = parseArgs(argv);

		expect(args).toEqual({ dryRun: false });
	});

	test("--settings and --dry-run are both read", () => {
		const argv = ["--settings", "/tmp/s.json", "--dry-run"];

		const args = parseArgs(argv);

		expect(args).toEqual({ dryRun: true, settings: "/tmp/s.json" });
	});

	test("--settings with no path throws", () => {
		const argv = ["--settings"];

		expect(() => parseArgs(argv)).toThrow("--settings needs a path");
	});

	test("an unknown argument throws", () => {
		const argv = ["--force"];

		expect(() => parseArgs(argv)).toThrow("Unknown argument --force");
	});
});

describe("planSetup", () => {
	test("a tier with no row plans no write", () => {
		const state = { oauthAccount: { organizationType: "claude_team" } };

		const plan = planSetup(state, {}, PLATFORM);

		expect(plan.write).toBeUndefined();
	});

	test("a tier with no row says so", () => {
		const state = {};

		const plan = planSetup(state, {}, PLATFORM);

		expect(plan.report).toContain("none");
	});

	test("a value the user set stays in the merged settings", () => {
		const current = { autoCompactWindow: 123 };

		const plan = planSetup(MAX_20X, current, PLATFORM);

		expect(plan.write?.["autoCompactWindow"]).toBe(123);
	});

	test("a value the user set is reported as skipped", () => {
		const current = { autoCompactWindow: 123 };

		const plan = planSetup(MAX_20X, current, PLATFORM);

		expect(plan.report).toContain("Skipped autoCompactWindow");
	});
});

describe("keys the user already set", () => {
	test("the user's own deny rules stay first, and the row's missing rules follow", () => {
		const current = {
			permissions: { deny: ["Read(./secrets/**)", "Workflow"] },
		};
		const row = denyRulesOf(tierSnippet(SNIPPET_ROW, PLATFORM));

		const plan = planSetup(MAX_20X, current, PLATFORM);

		expect(plan.write?.["permissions"]).toMatchObject({
			deny: [
				"Read(./secrets/**)",
				"Workflow",
				...row.filter((rule) => rule !== "Workflow"),
			],
		});
	});

	test("the user's own allow rules stay whole, since an added allow loosens", () => {
		const current = { permissions: { allow: ["Read"] } };

		const plan = planSetup(MAX_20X, current, PLATFORM);

		expect(plan.write?.["permissions"]).toMatchObject({ allow: ["Read"] });
	});

	test("a higher `minimumVersion` stays", () => {
		const current = { minimumVersion: "2.1.320" };

		const plan = planSetup(MAX_20X, current, PLATFORM);

		expect(plan.write?.["minimumVersion"]).toBe("2.1.320");
	});
});

describe("refusedPaths", () => {
	test("a refused key at the top level and in env is named by its path", () => {
		const snippet = { disableAllHooks: true, env: { DISABLE_UPDATES: "1" } };

		const paths = refusedPaths(snippet);

		expect(paths).toEqual(["disableAllHooks", "env.DISABLE_UPDATES"]);
	});

	test("no tier row writes a refused key", () => {
		const snippets = TIERS.map((row) => tierSnippet(row, PLATFORM));

		const paths = snippets.flatMap(refusedPaths);

		expect(paths).toEqual([]);
	});
});

describe("settingsText", () => {
	test("the text is 2-space JSON with a final newline", () => {
		const settings = { a: { b: 1 } };

		const text = settingsText(settings);

		expect(text).toBe('{\n  "a": {\n    "b": 1\n  }\n}\n');
	});
});

describe("the entry point", () => {
	let home: string;

	beforeEach(async () => {
		home = await mkdtemp(join(tmpdir(), "setup-spec-"));
		await writeFile(join(home, ".claude.json"), JSON.stringify(MAX_20X));
	});

	afterEach(async () => {
		await rm(home, { recursive: true, force: true });
	});

	const runIn = async (path: string, args: readonly string[]) => {
		const child = spawn([process.execPath, SCRIPT, ...args], {
			cwd: home,
			env: { ...process.env, HOME: home, PATH: path },
			stdout: "pipe",
			stderr: "pipe",
		});
		const out = await new Response(child.stdout).text();
		await child.exited;
		return { code: child.exitCode, out };
	};

	const run = async (...args: string[]) =>
		(await runIn(join(home, "no-bin"), args)).code;

	const stubOpenSpec = async (): Promise<string> => {
		const bin = join(home, "bin");
		await mkdir(bin);
		const stub = join(bin, "openspec");
		await writeFile(
			stub,
			'#!/bin/sh\necho "$* $OPENSPEC_TELEMETRY" > "$HOME/openspec-argv"\n/bin/mkdir openspec\n',
		);
		await chmod(stub, 0o755);
		return bin;
	};

	test("--dry-run writes no settings file", async () => {
		const target = join(home, "out.json");

		const code = await run("--settings", target, "--dry-run");

		expect(code).toBe(0);
		expect(await file(target).exists()).toBe(false);
	});

	test("a real run merges and keeps the user's value", async () => {
		const target = join(home, ".claude", "settings.json");
		await mkdir(join(home, ".claude"));
		await writeFile(target, JSON.stringify({ autoCompactWindow: 123 }));

		const code = await run();

		const written = JSON.parse(await readFile(target, "utf8"));
		expect(code).toBe(0);
		expect(written.autoCompactWindow).toBe(123);
		expect(written.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE).toBeString();
	});

	test("a real run leaves `~/.claude.json` byte for byte", async () => {
		const state = join(home, ".claude.json");
		const before = await readFile(state, "utf8");

		const code = await run();

		expect(code).toBe(0);
		expect(await readFile(state, "utf8")).toBe(before);
	});

	test("with `openspec` on PATH and no `openspec/`, a real run inits the `core` workflows for Claude", async () => {
		const bin = await stubOpenSpec();

		const { code, out } = await runIn(bin, []);

		expect(code).toBe(0);
		expect(await file(join(home, "openspec-argv")).text()).toBe(
			"init --tools claude --profile core 0\n",
		);
		expect(out).toContain("Ran `openspec init --tools claude --profile core`");
	});

	test("an existing `openspec/` is left alone", async () => {
		const bin = await stubOpenSpec();
		await mkdir(join(home, "openspec"));

		const { code, out } = await runIn(bin, []);

		expect(code).toBe(0);
		expect(await file(join(home, "openspec-argv")).exists()).toBe(false);
		expect(out).toContain("`openspec/` exists");
	});

	test("--dry-run names the init and does not run it", async () => {
		const bin = await stubOpenSpec();

		const { code, out } = await runIn(bin, ["--dry-run"]);

		expect(code).toBe(0);
		expect(await file(join(home, "openspec-argv")).exists()).toBe(false);
		expect(out).toContain(
			"Would run `openspec init --tools claude --profile core`",
		);
	});

	test("with no `openspec` on PATH, settings are written and the report names the missing CLI", async () => {
		const { code, out } = await runIn(join(home, "no-bin"), []);

		expect(code).toBe(0);
		expect(await file(join(home, ".claude", "settings.json")).exists()).toBe(
			true,
		);
		expect(await file(join(home, "openspec")).exists()).toBe(false);
		expect(out).toContain("`openspec` is not on PATH");
		expect(out).toContain("`bun add -g @fission-ai/openspec`");
	});
});
