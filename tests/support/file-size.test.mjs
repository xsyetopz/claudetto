// Each file has one concern, so it stays at `FILE_MAX_LINES` or less, and a
// test file at `TEST_FILE_MAX_LINES` or less (design D18). Generated files are
// out of scope, by name.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { FILE_MAX_LINES, TEST_FILE_MAX_LINES } from "../../tools/limits.mjs";
import { REPO, tmpDir } from "./repo.mjs";

const TEXT = /\.(?:mjs|cjs|js|ts|json|jsonc|md|mdx|py|sh|toml|ya?ml|txt)$/;
// Files that a tool writes: the settings schemas of `just schema`, lock
// files, and the OpenSpec skills and commands of `openspec update`.
const GENERATED = [
  /^schemas\//,
  /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml)$/,
  /^\.claude\/skills\/openspec-/,
  /^\.claude\/commands\/opsx\//,
];

function bound(file) {
  return /\.test\.[^/]+$/.test(file) ? TEST_FILE_MAX_LINES : FILE_MAX_LINES;
}

/** The files under `root` that are over their bound, as "lines file". */
function overBound(root, files) {
  return files
    .filter((f) => TEXT.test(f) && !GENERATED.some((g) => g.test(f)))
    .filter((f) => fs.existsSync(path.join(root, f)))
    .map((f) => {
      const text = fs.readFileSync(path.join(root, f), "utf8");
      const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
      return { f, lines };
    })
    .filter(({ f, lines }) => lines > bound(f))
    .map(({ f, lines }) => `${lines} ${f}`);
}

// A lint of the live repository.
test("lint: no repository file is over its line bound", () => {
  // Tracked and untracked files that git does not ignore, so `external/`
  // and `node_modules/` are out.
  const r = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: REPO, encoding: "utf8" },
  );
  assert.equal(r.status, 0);
  assert.deepEqual(overBound(REPO, r.stdout.split("\n").filter(Boolean)), []);
});

test("a file and a test file one line over the bound fail", () => {
  const root = tmpDir("file-size");
  const write = (name, n) =>
    fs.writeFileSync(path.join(root, name), "x\n".repeat(n));
  write("at.mjs", FILE_MAX_LINES);
  write("over.mjs", FILE_MAX_LINES + 1);
  write("at.test.mjs", TEST_FILE_MAX_LINES);
  write("over.test.mjs", TEST_FILE_MAX_LINES + 1);
  fs.mkdirSync(path.join(root, "schemas"));
  write("schemas/big.json", TEST_FILE_MAX_LINES + 1);
  const files = [
    "at.mjs",
    "over.mjs",
    "at.test.mjs",
    "over.test.mjs",
    "schemas/big.json",
  ];
  assert.deepEqual(overBound(root, files), [
    `${FILE_MAX_LINES + 1} over.mjs`,
    `${TEST_FILE_MAX_LINES + 1} over.test.mjs`,
  ]);
});
