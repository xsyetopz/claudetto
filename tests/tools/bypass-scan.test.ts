// Every `claude` command of `tools/` and `dev/` goes through the `$claude()` helper of `tools/telemetry.ts`.
// The scan reads the code of each file after the transpiler has removed its comments, so a comment that names `claude` does not count.
// The scan does not run `claude`.

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile, Glob, Transpiler } from "bun";

const REPO = path.resolve(import.meta.dirname, "../..");
const HELPER = "$claude()";

// Interactive sessions may start `claude` without the helper. Each entry gives the reason.
const ALLOWED: Record<string, string> = {
	"dev/sandbox/run.ts":
		"starts the interactive sandbox session, which the terminal of the script hosts",
	"dev/sandbox/install.ts":
		"starts the interactive sandbox session after the install",
	"dev/eval-variant.ts":
		"runs the eval comparison on the plain env, so the eval flags stay as the user set them",
};

/** The `claude` commands in `code` that do not go through the helper. */
const bypasses = (code: string): string[] => {
	const hits: string[] = [];
	// A tagged template whose text starts with `claude`, such as `$`claude plugin …`.
	for (const m of code.matchAll(/([\w$.]+(?:\(\))?)\s*`claude[\s`]/g)) {
		if (m[1] !== HELPER) {
			hits.push(m[0]);
		}
	}
	// An argument list that starts with `"claude"`, such as `Bun.spawn(["claude", …])`.
	for (const m of code.matchAll(
		/(?:\[\s*|spawn(?:Sync)?\(\s*)["'`]claude["'`]/g,
	)) {
		hits.push(m[0]);
	}
	return hits;
};

/** The number of `claude` commands in `code` that go through the helper. */
const viaHelper = (code: string): number =>
	[...code.matchAll(/\$claude\(\)\s*`claude[\s`]/g)].length;

const codeOf = (source: string): string =>
	new Transpiler({ loader: "ts" }).transformSync(source);

test("a `claude` command outside the helper is a bypass, and a comment that names one is not", () => {
	const code = codeOf(
		[
			"// $`claude plugin test x` is in a comment, not a command",
			"const a = await $`claude plugin tag x`;",
			'const b = Bun.spawn(["claude", "plugin", "test"]);',
			"const c = await $claude()`claude plugin test y`;",
		].join("\n"),
	);

	expect(bypasses(code)).toEqual(["$`claude ", '["claude"']);
	expect(viaHelper(code)).toBe(1);
});

test("every `claude` command of `tools/` and `dev/` goes through the helper", async () => {
	const violations: string[] = [];
	let helperCalls = 0;
	for await (const rel of new Glob("{tools,dev}/**/*.ts").scan({
		cwd: REPO,
	})) {
		if (rel === "tools/telemetry.ts" || ALLOWED[rel]) {
			continue;
		}
		const code = codeOf(await bunFile(path.join(REPO, rel)).text());
		helperCalls += viaHelper(code);
		for (const hit of bypasses(code)) {
			violations.push(`${rel}: ${hit}`);
		}
	}

	// A scan that finds no helper call is broken, so the count is a check of the scan.
	expect(helperCalls).toBeGreaterThan(0);
	expect(violations).toEqual([]);
});
