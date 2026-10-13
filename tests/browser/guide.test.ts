// dotclaude-browser: the `browse` skill loads the `agent-browser` guide through the bin `dotclaude-browser-guide`.
// The bin test runs with a `PATH` of one empty folder, so no `agent-browser` runs.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  GUIDE_COMMAND,
  type GuideRun,
  guideText,
  NOT_INSTALLED,
  noGuide,
} from "../../plugins/dotclaude-browser/slices/browse/domain/guide.ts";
import { MAX_GUIDE_CHARS } from "../../plugins/dotclaude-browser/slices/browse/limits.ts";
import { PLUGINS } from "../support/repo.ts";

const BIN = path.join(PLUGINS, "dotclaude-browser/bin/dotclaude-browser-guide");
const SKILL = path.join(PLUGINS, "dotclaude-browser/skills/browse/SKILL.md");

test("a guide in the bound passes with no change", () => {
  expect(guideText({ status: 0, stdout: "# core\nopen" })).toBe("# core\nopen");
});

test("a guide over the bound stops at the bound with a notice", () => {
  const out = guideText({ status: 0, stdout: "a".repeat(30) }, 10);
  expect(out.startsWith(`${"a".repeat(10)}\n`)).toBeTruthy();
  expect(!out.includes("a".repeat(11))).toBeTruthy();
  expect(out.includes(`\`${GUIDE_COMMAND.join(" ")}\``)).toBeTruthy();
});

test("a missing binary gives the install text", () => {
  const error = Object.assign(new Error("spawn"), { code: "ENOENT" });
  expect(guideText({ status: null, error })).toBe(NOT_INSTALLED);
});

test("a timeout, a failed run, or an empty guide names the reason and not a missing install", () => {
  const error = Object.assign(new Error("spawn"), { code: "ETIMEDOUT" });
  const cases: [GuideRun, string][] = [
    [{ status: null, error }, "ETIMEDOUT"],
    [{ status: 1, stdout: "x" }, "exit code 1"],
    [{ status: 0, stdout: " \n" }, "empty output"],
  ];
  for (const [run, why] of cases) {
    expect(guideText(run)).toBe(noGuide(why));
    expect(guideText(run)).not.toBe(NOT_INSTALLED);
  }
});

test("the default bound is `MAX_GUIDE_CHARS`", () => {
  const out = guideText({ status: 0, stdout: "a".repeat(MAX_GUIDE_CHARS + 1) });
  expect(out.startsWith("a".repeat(MAX_GUIDE_CHARS))).toBeTruthy();
  expect(!out.includes("a".repeat(MAX_GUIDE_CHARS + 1))).toBeTruthy();
});

test("the skill loads the guide through the bin, and `allowed-tools` grants only the bin", async () => {
  const text = await Bun.file(SKILL).text();
  expect(text).toMatch(/^!`dotclaude-browser-guide`$/m);
  expect(text).toMatch(
    /^allowed-tools: Bash\(agent-browser \*\) Bash\(dotclaude-browser-guide\)$/m,
  );
  expect(!text.includes("!`agent-browser")).toBeTruthy();
});

test("with no `agent-browser` on `PATH`, the bin prints the install text and exits 0", () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "guide-"));
  const out = Bun.spawnSync({
    cmd: [process.execPath, "--no-env-file", BIN],
    env: { ...process.env, PATH: empty },
    stdout: "pipe",
  });
  fs.rmSync(empty, { recursive: true });
  expect(out.exitCode).toBe(0);
  expect(out.stdout.toString().trim()).toBe(NOT_INSTALLED);
});
