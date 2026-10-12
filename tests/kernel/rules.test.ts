// The rule checks of the kernel: the `paths` front matter, the brace budget, and the rules in the context.

import { expect, test } from "bun:test";
import { parse } from "yaml";
import {
  checkRule,
  expansions,
  frontOf,
  MAX_PATTERNS,
  pathsOf,
  startRules,
  startRuleTokens,
} from "../../src/kernel/rules.ts";
import { expansions as scriptExpansions } from "../../src/plugins/dotclaude/slices/rules/skills/rules-creator/scripts/check-globs.ts";

const match = (glob: string, file: string) => new Bun.Glob(glob).match(file);
const files = ["src/a.ts", "docs/b.md"];
const rule = (front: string) => `---\n${front}\n---\nBody.\n`;
const check = (text: string) => checkRule("r.md", text, files, parse, match);

test("a rule with no front matter has no problem", () => {
  expect(check("Body.\n")).toStrictEqual([]);
});

test("a `paths` YAML that does not parse is a `yaml` problem and no glob problem", () => {
  expect(check(rule("paths: [unclosed"))).toStrictEqual([
    { rule: "r.md", kind: "yaml" },
  ]);
});

test("a glob that matches no file is a `no-match` problem, and a glob that matches is not", () => {
  expect(check(rule('paths:\n  - "src/**/*.ts"\n  - "lib/**"'))).toStrictEqual([
    { rule: "r.md", kind: "no-match", glob: "lib/**" },
  ]);
});

test("a comma-separated string gives one glob for each part", () => {
  expect(pathsOf({ paths: "src/**, docs/**" })).toStrictEqual([
    "src/**",
    "docs/**",
  ]);
});

test("braces over the budget are a `budget` problem with the count", () => {
  const group = `{${Array.from({ length: MAX_PATTERNS + 1 }, (_, i) => i).join(",")}}`;
  const problems = check(rule(`paths: ["src/${group}"]`));
  expect(problems.find((p) => p.kind === "budget")?.count).toBe(
    MAX_PATTERNS + 1,
  );
});

test("`expansions` agrees with the copy in the script of the `/rules-creator` skill", () => {
  for (const glob of ["a", "{a,b}", "{a,b}/{c,d,e}", "{a,{b,c}}x", "}{"])
    expect(expansions(glob)).toBe(scriptExpansions(glob));
});

test("`frontOf` returns the text between the first two fences", () => {
  expect(frontOf("---\na: 1\n---\nbody")).toBe("a: 1");
  expect(frontOf("body")).toBeUndefined();
});

test("the rules at the start are the memory files of a `.claude/rules/` folder", () => {
  const memory = [
    { path: "/p/CLAUDE.md", type: "Project", tokens: 100 },
    { path: "/p/.claude/rules/a.md", type: "Project", tokens: 20 },
    { path: "/home/u/.claude/rules/b.md", type: "User", tokens: 5 },
    { path: "/p/docs/rules/c.md", type: "Project", tokens: 7 },
  ];
  expect(startRules(memory).map((f) => f.path)).toStrictEqual([
    "/p/.claude/rules/a.md",
    "/home/u/.claude/rules/b.md",
  ]);
  expect(startRuleTokens(memory)).toBe(25);
});
