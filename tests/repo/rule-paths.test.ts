// Each `paths:` glob of a rule in `.claude/rules/` must match a tracked file.
// Claude Code loads a path-scoped rule only for a file that its globs match,
// so a glob that matches no file is a rule that never loads.

import { expect, test } from "bun:test";
import path from "node:path";
import { file, Glob, spawn } from "bun";
import { parse } from "yaml";
import { REPO, walk } from "../support/repo.ts";

const RULES = path.join(REPO, ".claude", "rules");
const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n/;

/** The `paths:` globs in the front matter of a rule. A rule with no front matter has none. */
const pathsOf = (text: string): string[] => {
	const head = FRONT_MATTER.exec(text);
	if (!head) {
		return [];
	}
	const front: { paths?: unknown } | null = parse(head[1] ?? "");
	return Array.isArray(front?.paths) ? front.paths.map(String) : [];
};

/** The globs that match none of the files. */
const unmatched = (globs: string[], files: string[]): string[] =>
	globs.filter((g) => {
		const glob = new Glob(g);
		return !files.some((f) => glob.match(f));
	});

const tracked = async (): Promise<string[]> => {
	const r = spawn(["git", "ls-files"], { cwd: REPO, stdout: "pipe" });
	const [stdout, exitCode] = await Promise.all([
		new Response(r.stdout).text(),
		r.exited,
	]);
	if (exitCode !== 0) {
		throw new Error(`git ls-files exited ${exitCode}`);
	}
	return stdout.split("\n").filter(Boolean);
};

test("Rule paths: each `paths:` glob of each rule matches a tracked file", async () => {
	const files = await tracked();
	const rules = await walk(RULES, { keep: (f) => f.endsWith(".md") });
	expect(rules.length).toBeGreaterThan(0);
	const texts = await Promise.all(rules.map((rule) => file(rule).text()));
	const missing = rules.flatMap((rule, i) =>
		unmatched(pathsOf(texts[i] ?? ""), files).map(
			(glob) => `${path.relative(REPO, rule)}: ${glob}`,
		),
	);
	expect(missing).toStrictEqual([]);
});

test("Rule paths: a glob that matches no file is reported, and a matching one is not", () => {
	expect(
		unmatched(["src/**/*.ts", "src/missing/*.md"], ["src/a/b.ts"]),
	).toStrictEqual(["src/missing/*.md"]);
});

test("Rule paths: the globs come from the `paths:` list of the front matter", () => {
	const text =
		'---\npaths:\n  - "src/**/*.ts"\n  - "tests/**"\n---\n\nRule text.\n';
	expect(pathsOf(text)).toStrictEqual(["src/**/*.ts", "tests/**"]);
	expect(pathsOf("# A rule with no front matter\n")).toStrictEqual([]);
});
