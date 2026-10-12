// The glob check script that the skill `/rules-creator` ships.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { REPO } from "../../support/repo.ts";

const SCRIPT = path.join(
  REPO,
  "src/plugins/dotclaude/slices/rules/skills/rules-creator/scripts/check-globs.ts",
);
const { check, expansions, pathsOf } = await import(SCRIPT);

test("`pathsOf` reads a YAML list, a comma string, and no key", () => {
  expect(pathsOf("---\npaths:\n  - a/**/*.ts\n  - b.md\n---\nBody")).toEqual([
    "a/**/*.ts",
    "b.md",
  ]);
  expect(pathsOf("---\npaths: a/*.ts, b/*.ts\n---\n")).toEqual([
    "a/*.ts",
    "b/*.ts",
  ]);
  expect(pathsOf("---\nname: x\n---\n")).toEqual([]);
  expect(pathsOf("No front matter")).toEqual([]);
  expect(pathsOf("---\npaths: [unclosed\n---\n")).toEqual([]);
});

test("`expansions` multiplies nested and sequential braces", () => {
  expect(expansions("src/*.ts")).toBe(1);
  expect(expansions("*.{ts,tsx}")).toBe(2);
  expect(expansions("{a,b}/{c,d,e}")).toBe(6);
  expect(expansions("{a,{b,c}}")).toBe(3);
});

test("`check` flags a glob with no file and a brace budget overflow", () => {
  const files = ["src/a.ts", "docs/b.md"];
  expect(check("r.md", ["src/**/*.ts", "docs/*.{md,mdx}"], files)).toEqual([]);
  const bad = check("r.md", ["lib/**"], files);
  expect(bad).toHaveLength(1);
  expect(bad[0].glob).toBe("lib/**");
  const big = "{a,b}".repeat(10);
  const over = check("r.md", [big], ["a".repeat(10)]);
  expect(
    over.filter((p: { glob?: string }) => p.glob === undefined),
  ).toHaveLength(1);
});

test("the script exits 1 for an unmatched glob and 0 when all match", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p30-"));
  try {
    const sh = (...cmd: string[]) =>
      Bun.spawnSync(cmd, { cwd: dir, stdout: "pipe", stderr: "pipe" });
    sh("git", "init", "-q");
    await Bun.write(path.join(dir, "src/a.ts"), "");
    const rule = path.join(dir, ".claude/rules/r.md");
    await Bun.write(rule, "---\npaths:\n  - src/**/*.ts\n---\nUse x.\n");
    const run = () => sh("bun", SCRIPT, ".claude/rules", ".");
    expect(run().exitCode).toBe(0);
    await Bun.write(rule, "---\npaths:\n  - lib/**/*.ts\n---\nUse x.\n");
    const r = run();
    expect(r.exitCode).toBe(1);
    expect(r.stdout.toString()).toContain("lib/**/*.ts");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
