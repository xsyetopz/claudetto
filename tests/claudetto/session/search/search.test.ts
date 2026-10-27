// The search tools of `session/search` (task 19.14): the input that a call may have, the argv for each search program, and the output.

import { expect, test } from "bun:test";
import {
	globOutput,
	grepArgv,
	grepOutput,
	parseGrep,
} from "../../../../plugins/claudetto/modules/session/search/domain/search.ts";

const input = (raw: Record<string, unknown>) => {
	const parsed = parseGrep(raw);
	if (typeof parsed === "string") {
		throw new Error(parsed);
	}
	return parsed;
};

test("a pattern that starts with `-` is a pattern for each program, not an option", () => {
	for (const program of ["rg", "ugrep", "grep"] as const) {
		const argv = grepArgv(program, input({ pattern: "--files" }));
		expect(argv[argv.indexOf("-e") + 1], program).toBe("--files");
		expect(argv.indexOf("--"), program).toBeGreaterThan(argv.indexOf("-e"));
	}
});

test("each program gets the mode, the case, the context, and the glob of the input", () => {
	const argv = (program: "rg" | "grep") =>
		grepArgv(
			program,
			input({
				pattern: "x",
				output_mode: "content",
				"-i": true,
				"-C": 2,
				glob: "*.ts",
			}),
		);
	for (const program of ["rg", "grep"] as const) {
		expect(argv(program), program).toContain("-i");
		expect(argv(program), program).toContain("-C");
		expect(argv(program), program).toContain("2");
	}
	expect(argv("rg")).toContain("*.ts");
	expect(argv("grep")).toContain("--include=*.ts");
});

test("the mode `files_with_matches` lists files, and the mode `count` counts", () => {
	expect(grepArgv("rg", input({ pattern: "x" }))).toContain("-l");
	expect(
		grepArgv("grep", input({ pattern: "x", output_mode: "count" })),
	).toContain("-c");
});

test("each program skips `.git` and the secret `.env` files", () => {
	const argv = grepArgv("grep", input({ pattern: "x" }));
	expect(argv).toContain("--exclude-dir=.git");
	expect(argv).toContain("--exclude=.env");
	expect(grepArgv("rg", input({ pattern: "x" })).join(" ")).toContain("!.env");
});

test("an input with no pattern, or a field of the wrong type, gives a reason", () => {
	expect(typeof parseGrep({})).toBe("string");
	expect(typeof parseGrep({ pattern: "x", "-A": "two" })).toBe("string");
	expect(typeof parseGrep({ pattern: "x", head_limit: -1 })).toBe("string");
});

test("`offset` and `head_limit` cut the lines, and the output tells how many are left", () => {
	const lines = Array.from({ length: 10 }, (_, i) => `f:${i}:x`).join("\n");
	const out = grepOutput(
		lines,
		input({ pattern: "x", offset: 2, head_limit: 3 }),
	);
	expect(out).toContain("f:2:x");
	expect(out).toContain("f:4:x");
	expect(out).not.toContain("f:5:x");
	expect(out).not.toContain("f:1:x");
	expect(out).toContain("5");
});

test("`head_limit` 0 gives each line, and a count of `:0` is left out", () => {
	const lines = Array.from({ length: 300 }, (_, i) => `f${i}:1`).join("\n");
	const all = grepOutput(lines, input({ pattern: "x", head_limit: 0 }));
	expect(all.split("\n")).toHaveLength(300);
	const counts = grepOutput(
		"a:2\nb:0",
		input({ pattern: "x", output_mode: "count" }),
	);
	expect(counts).toBe("a:2");
});

test("`glob` matches `**`, `*`, `?`, and braces, and a pattern with no `/` matches at each depth", () => {
	const files = "src/a.ts\nsrc/deep/b.ts\nc.ts\nsrc/d.md\nsrc/e.tsx\n";
	const list = (pattern: string) =>
		globOutput(files, pattern, "/p").split("\n");
	expect(list("**/*.ts")).toStrictEqual([
		"/p/c.ts",
		"/p/src/a.ts",
		"/p/src/deep/b.ts",
	]);
	expect(list("src/*.ts")).toStrictEqual(["/p/src/a.ts"]);
	expect(list("*.{md,tsx}")).toStrictEqual(["/p/src/d.md", "/p/src/e.tsx"]);
	expect(list("src/?.ts")).toStrictEqual(["/p/src/a.ts"]);
});

test("`glob` cuts the list at the bound and tells how many files are left", () => {
	const files = Array.from({ length: 150 }, (_, i) => `f${i}.ts`).join("\n");
	const lines = globOutput(files, "*.ts", "/p").split("\n");
	expect(lines.filter((l) => l.startsWith("/p/"))).toHaveLength(100);
	expect(lines.at(-1)).toContain("50");
});
