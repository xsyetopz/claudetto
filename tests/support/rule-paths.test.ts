// Each `paths:` glob of a rule in `.claude/rules/` must match a tracked file.
// Claude Code loads a path-scoped rule only for a file that its globs match,
// so a glob that matches no file is a rule that never loads.

import { expect, test } from "bun:test";
import path from "node:path";
import { parse } from "yaml";
import { REPO, walk } from "./repo.ts";

const RULES = path.join(REPO, ".claude", "rules");

/** The `paths:` globs in the front matter of a rule. A rule with no front matter has none. */
const pathsOf = (text: string): string[] => {
  const head = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!head) return [];
  const front = parse(head[1] ?? "") as { paths?: unknown } | null;
  return Array.isArray(front?.paths) ? front.paths.map(String) : [];
};

/** The globs that match none of the files. */
const unmatched = (globs: string[], files: string[]): string[] =>
  globs.filter((g) => {
    const glob = new Bun.Glob(g);
    return !files.some((f) => glob.match(f));
  });

const tracked = (): string[] => {
  const r = Bun.spawnSync(["git", "ls-files"], { cwd: REPO });
  expect(r.exitCode).toBe(0);
  return r.stdout.toString().split("\n").filter(Boolean);
};

test("Rule paths: each `paths:` glob of each rule matches a tracked file", async () => {
  const files = tracked();
  const rules = walk(RULES, { keep: (f) => f.endsWith(".md") });
  expect(rules.length).toBeGreaterThan(0);
  const texts = await Promise.all(rules.map((rule) => Bun.file(rule).text()));
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
