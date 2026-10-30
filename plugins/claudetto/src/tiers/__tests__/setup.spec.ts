// The pure decisions are called directly. The entry point runs as a child process with `HOME` aimed
// at a temporary directory, so no test reads or writes the real `~/.claude`.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { file, spawn } from "bun";
import { parseArgs, planSetup, refusedPaths, settingsText } from "../setup.ts";
import { tierSnippet } from "../snippet.ts";
import { TIERS } from "../tiers.ts";

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

		const plan = planSetup(state, {});

		expect(plan.write).toBeUndefined();
	});

	test("a tier with no row says so", () => {
		const state = {};

		const plan = planSetup(state, {});

		expect(plan.report).toContain("none");
	});

	test("a value the user set stays in the merged settings", () => {
		const current = { autoCompactWindow: 123 };

		const plan = planSetup(MAX_20X, current);

		expect(plan.write?.["autoCompactWindow"]).toBe(123);
	});

	test("a value the user set is reported as skipped", () => {
		const current = { autoCompactWindow: 123 };

		const plan = planSetup(MAX_20X, current);

		expect(plan.report).toContain("Skipped autoCompactWindow");
	});
});

describe("refusedPaths", () => {
	test("a refused key at the top level and in env is named by its path", () => {
		const snippet = { disableAllHooks: true, env: { DISABLE_UPDATES: "1" } };

		const paths = refusedPaths(snippet);

		expect(paths).toEqual(["disableAllHooks", "env.DISABLE_UPDATES"]);
	});

	test("no tier row writes a refused key", () => {
		const snippets = TIERS.map(tierSnippet);

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

	const run = async (...args: string[]) => {
		const child = spawn(["bun", SCRIPT, ...args], {
			env: { ...process.env, HOME: home },
			stdout: "pipe",
			stderr: "pipe",
		});
		await child.exited;
		return child.exitCode;
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
});
