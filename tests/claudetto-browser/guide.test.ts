// claudetto-browser: the `browse` skill loads the `agent-browser` guide through the bin `claudetto-browser-guide`.
// The bin test runs with a `PATH` of one empty folder, so no `agent-browser` runs.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  GUIDE_COMMAND,
  type GuideRun,
  guideText,
} from "../../plugins/claudetto-browser/slices/browse/guide.ts";
import { MAX_GUIDE_CHARS } from "../../plugins/claudetto-browser/slices/browse/limits.ts";
import { NOT_INSTALLED } from "../../plugins/claudetto-browser/slices/browse/prompts.ts";
import { PLUGINS } from "../support/repo.ts";

const BIN = path.join(PLUGINS, "claudetto-browser/bin/claudetto-browser-guide");
const SKILL = path.join(PLUGINS, "claudetto-browser/skills/browse/SKILL.md");

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
    expect(guideText(run)).toContain(why);
    expect(guideText(run)).not.toBe(NOT_INSTALLED);
  }
});

test("the default bound is `MAX_GUIDE_CHARS`", () => {
  const out = guideText({ status: 0, stdout: "a".repeat(MAX_GUIDE_CHARS + 1) });
  expect(out.startsWith("a".repeat(MAX_GUIDE_CHARS))).toBeTruthy();
  expect(!out.includes("a".repeat(MAX_GUIDE_CHARS + 1))).toBeTruthy();
});

test("the skill loads the guide through the bin", async () => {
  const text = await Bun.file(SKILL).text();
  expect(text).toMatch(/^!`claudetto-browser-guide`$/m);
  expect(!text.includes("!`agent-browser")).toBeTruthy();
});

test("`allowed-tools` grants the bin and only named `agent-browser` subcommands", async () => {
  const text = await Bun.file(SKILL).text();
  const line = text.match(/^allowed-tools: (.*)$/m)?.[1] ?? "";
  const grants = line.match(/Bash\([^)]*\)/g) ?? [];
  expect(grants).toContain("Bash(claudetto-browser-guide)");
  expect(grants).not.toContain("Bash(agent-browser *)");
  const subcommands = grants
    .map((g) => g.match(/^Bash\(agent-browser (\S+) \*\)$/)?.[1])
    .filter((g) => g !== undefined);
  expect(subcommands.length + 1).toBe(grants.length);
  for (const open of ["eval", "mcp", "install", "auth", "network", "upload"])
    expect(subcommands).not.toContain(open);
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
