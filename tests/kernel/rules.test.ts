// The rule checks of the kernel: the `paths` front matter, the brace budget.

import { expect, test } from "bun:test";
import path from "node:path";
import { parse } from "yaml";
import { MAX_PATTERNS } from "../../src/kernel/budget.ts";
import { checkRule, frontOf, pathsOf } from "../../src/kernel/rules.ts";

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

test("a `SyntaxError` of `Bun.YAML.parse` is a `yaml` problem", () => {
  const text = rule("paths: [unclosed");
  const problems = checkRule("r.md", text, files, Bun.YAML.parse, match);
  expect(problems).toStrictEqual([{ rule: "r.md", kind: "yaml" }]);
});

test("a parser error that is not a YAML error is thrown again", () => {
  const broken = () => {
    throw new TypeError("parser bug");
  };
  const text = rule("paths: []");
  expect(() => checkRule("r.md", text, files, broken, match)).toThrow(
    TypeError,
  );
});

test("no file of `src/kernel/` other than `budget.ts` exports a number", async () => {
  const numeric = /^export const [A-Z_]+ = [\d_]+;/m;
  const outside: string[] = [];
  for await (const f of new Bun.Glob("**/*.ts").scan({ cwd: "src/kernel" }))
    if (
      f !== "budget.ts" &&
      numeric.test(await Bun.file(path.join("src/kernel", f)).text())
    )
      outside.push(f);
  expect(outside).toStrictEqual([]);
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

test("`frontOf` returns the text between the first two fences", () => {
  expect(frontOf("---\na: 1\n---\nbody")).toBe("a: 1");
  expect(frontOf("body")).toBeUndefined();
});
