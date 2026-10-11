// dotclaude-browser: the `drive-web-browser` skill loads the `agent-browser` guide through the bin `dotclaude-browser-guide`.
// The bin test runs with a `PATH` of one empty folder, so no `agent-browser` runs.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  GUIDE_COMMAND,
  guideText,
  NOT_INSTALLED,
  noGuide,
} from "../../plugins/dotclaude-browser/features/guide/guide.mjs";
import { MAX_GUIDE_CHARS } from "../../plugins/dotclaude-browser/features/guide/limits.mjs";
import { PLUGINS } from "../support/repo.mjs";

const BIN = path.join(PLUGINS, "dotclaude-browser/bin/dotclaude-browser-guide");
const SKILL = path.join(
  PLUGINS,
  "dotclaude-browser/skills/drive-web-browser/SKILL.md",
);

test("a guide in the bound passes with no change", () => {
  assert.equal(
    guideText({ status: 0, stdout: "# core\nopen" }),
    "# core\nopen",
  );
});

test("a guide over the bound stops at the bound with a notice", () => {
  const out = guideText({ status: 0, stdout: "a".repeat(30) }, 10);
  assert.ok(out.startsWith(`${"a".repeat(10)}\n`));
  assert.ok(!out.includes("a".repeat(11)));
  assert.match(out, /stops at 10 characters/);
  assert.ok(out.includes(`\`${GUIDE_COMMAND.join(" ")}\``));
});

test("a missing binary gives the install text", () => {
  const error = Object.assign(new Error("spawn"), { code: "ENOENT" });
  assert.equal(guideText({ status: null, error }), NOT_INSTALLED);
});

test("a timeout, a failed run, or an empty guide names the reason and not a missing install", () => {
  const error = Object.assign(new Error("spawn"), { code: "ETIMEDOUT" });
  for (const [run, why] of [
    [{ status: null, error }, "ETIMEDOUT"],
    [{ status: 1, stdout: "x" }, "exit code 1"],
    [{ status: 0, stdout: " \n" }, "empty output"],
  ]) {
    assert.equal(guideText(run), noGuide(why));
    assert.notEqual(guideText(run), NOT_INSTALLED);
  }
});

test("the default bound is `MAX_GUIDE_CHARS`", () => {
  const out = guideText({ status: 0, stdout: "a".repeat(MAX_GUIDE_CHARS + 1) });
  assert.ok(
    out.includes(
      `stops at ${MAX_GUIDE_CHARS.toLocaleString("en-US")} characters`,
    ),
  );
});

test("the skill loads the guide through the bin, and `allowed-tools` grants only the bin", () => {
  const text = fs.readFileSync(SKILL, "utf8");
  assert.match(text, /^!`dotclaude-browser-guide`$/m);
  assert.match(
    text,
    /^allowed-tools: Bash\(agent-browser \*\) Bash\(dotclaude-browser-guide\)$/m,
  );
  assert.ok(!text.includes("!`agent-browser"));
});

test("with no `agent-browser` on `PATH`, the bin prints the install text and exits 0", () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "guide-"));
  const out = spawnSync(process.execPath, [BIN], {
    encoding: "utf8",
    env: { ...process.env, PATH: empty },
  });
  fs.rmSync(empty, { recursive: true });
  assert.equal(out.status, 0);
  assert.equal(out.stdout.trim(), NOT_INSTALLED);
});
