// Test titles and comments put each code item in inline code. The scan
// covers a fixed list of tool names, hook event names, and file names.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { scan, WORDS } from "./code-items.mjs";

const REPO = path.join(import.meta.dirname, "../..");
const ROOTS = ["tests", "plugins", "tools"];
const SKIP_DIRS = new Set(["node_modules", "external", "openspec", "schemas"]);
// Another agent writes these two folders now, so the check leaves them out.
// Remove the entries when that work lands.
const SKIP_PATHS = ["tests/codegraph", "plugins/dotclaude-codegraph"];
const CODE = /\.(?:mjs|ts)$/;

function sources(dir) {
  const rel = path.relative(REPO, dir).split(path.sep).join("/");
  if (SKIP_PATHS.includes(rel) || rel.endsWith(".claude-plugin/types")) {
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return SKIP_DIRS.has(e.name) ? [] : sources(full);
    return CODE.test(e.name) ? [full] : [];
  });
}

/** Lines such as "file:line: word", one for each bare code item. */
function report(file, text) {
  return scan(text).map((h) => `${file}:${h.line}: ${h.word}`);
}

test("the scan finds a bare `Read` in a fixture title", () => {
  const fixture = ["test(", '"Read is denied for a path"', ", () => {})"].join(
    "",
  );
  expect(report("fixture.test.mjs", fixture)).toEqual([
    "fixture.test.mjs:1: Read",
  ]);
});

test("the scan finds a bare name in a fixture comment, and skips inline code", () => {
  const fixture = [
    "// The Bash tool runs `hooks.json` and `Read`.",
    "// See hooks.json for the PreToolUse entry.",
  ].join("\n");
  expect(report("fixture.mjs", fixture)).toEqual([
    "fixture.mjs:1: Bash",
    "fixture.mjs:2: PreToolUse",
    "fixture.mjs:2: hooks.json",
  ]);
});

test("the scan keeps the list of words small", () => {
  expect(WORDS).not.toContain("Stop");
  expect(WORDS.length).toBeLessThanOrEqual(20);
});

test("each test title and comment puts its code items in inline code", () => {
  const found = ROOTS.flatMap((r) => sources(path.join(REPO, r))).flatMap(
    (file) => report(path.relative(REPO, file), fs.readFileSync(file, "utf8")),
  );
  expect(found).toEqual([]);
});
