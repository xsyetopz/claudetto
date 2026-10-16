// Tests of the git rules that setup adds: `excludeLines` of the domain and `excludeRuntimePaths` of the adapter.
// Each rule of `RUNTIME_PATTERNS` has a test in a repository with no rule, one with the rule, and a folder that is not a git repository.
// The tests run `git` in a temp folder, with the ignore file of the user hidden by the repository config.

import { afterAll, beforeAll, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  GIT_EXCLUDE_PATTERNS,
  HANDOFF_DIR,
} from "../../../src/kernel/paths.ts";
import { excludeRuntimePaths } from "../../../src/plugins/claudetto/slices/setup/adapters/exclude-step.ts";
import {
  EXCLUDE_HEADER,
  excludeLines,
  RUNTIME_PATTERNS,
  samplePath,
} from "../../../src/plugins/claudetto/slices/setup/domain/exclude.ts";

let scratch = "";

beforeAll(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "p32-exclude-"));
});

afterAll(() => fs.rmSync(scratch, { recursive: true, force: true }));

let count = 0;
const folder = (): string => {
  const dir = path.join(scratch, `case-${count++}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const repo = (): string => {
  const dir = folder();
  // The repository config hides the ignore file of the user, so that only the rules of the test count.
  for (const args of [
    ["init", "-q", dir],
    ["-C", dir, "config", "core.excludesFile", "/dev/null"],
  ]) {
    const r = Bun.spawnSync(["git", ...args]);
    if (r.exitCode !== 0) throw new Error(r.stderr.toString());
  }
  return dir;
};

const excludeFile = (dir: string): string =>
  path.join(dir, ".git", "info", "exclude");

const ignores = (dir: string, pattern: string): boolean =>
  Bun.spawnSync(["git", "check-ignore", "-q", samplePath(pattern)], {
    cwd: dir,
  }).exitCode === 0;

test("the rules hold the runtime paths of `.claude/` and the handoff folder of `.claudetto/`", () => {
  expect(RUNTIME_PATTERNS).toStrictEqual(GIT_EXCLUDE_PATTERNS);
  expect(RUNTIME_PATTERNS).toContain(`**/${HANDOFF_DIR}/`);
  expect(RUNTIME_PATTERNS).toContain("**/.claude/settings.local.json");
});

test("`excludeLines` gives the header and each pattern for an empty file", () => {
  expect(excludeLines("", [])).toStrictEqual([
    EXCLUDE_HEADER,
    ...RUNTIME_PATTERNS,
  ]);
});

test("`excludeLines` skips a pattern that the file or git already has, and adds the header once", () => {
  const first = RUNTIME_PATTERNS[0] as string;
  const second = RUNTIME_PATTERNS[1] as string;
  const lines = excludeLines(`${EXCLUDE_HEADER}\n${first}\n`, [second]);
  expect(lines).toStrictEqual(RUNTIME_PATTERNS.slice(2));
});

test("`excludeLines` gives nothing when each pattern has a rule", () => {
  expect(excludeLines(RUNTIME_PATTERNS.join("\n"), [])).toStrictEqual([]);
});

for (const pattern of RUNTIME_PATTERNS) {
  test(`${pattern}: a repository with no rule gets it, and git then ignores the path`, async () => {
    const dir = repo();
    expect(ignores(dir, pattern)).toBe(false);
    const added = await excludeRuntimePaths(dir);
    expect(added).toContain(pattern);
    expect((await Bun.file(excludeFile(dir)).text()).split("\n")).toContain(
      pattern,
    );
    expect(ignores(dir, pattern)).toBe(true);
  });

  test(`${pattern}: a repository with the rule gets no second line`, async () => {
    const dir = repo();
    fs.appendFileSync(excludeFile(dir), `${pattern}\n`);
    const added = await excludeRuntimePaths(dir);
    expect(added).not.toContain(pattern);
    const lines = (await Bun.file(excludeFile(dir)).text()).split("\n");
    expect(lines.filter((line) => line === pattern)).toHaveLength(1);
  });

  test(`${pattern}: a folder that is not a git repository gets no change`, async () => {
    const dir = folder();
    expect(await excludeRuntimePaths(dir)).toStrictEqual([]);
    expect(fs.readdirSync(dir)).toStrictEqual([]);
  });
}

test("a second run on the same repository adds nothing", async () => {
  const dir = repo();
  await excludeRuntimePaths(dir);
  const before = await Bun.file(excludeFile(dir)).text();
  expect(await excludeRuntimePaths(dir)).toStrictEqual([]);
  expect(await Bun.file(excludeFile(dir)).text()).toBe(before);
});

test("a pattern that the project `.gitignore` covers gets no line in `.git/info/exclude`", async () => {
  const dir = repo();
  await Bun.write(path.join(dir, ".gitignore"), `${HANDOFF_DIR}/\n`);
  const added = await excludeRuntimePaths(dir);
  expect(added).not.toContain(`**/${HANDOFF_DIR}/`);
  expect(added).toContain("**/.claude/settings.local.json");
});
