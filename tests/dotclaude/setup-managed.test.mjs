// Setup and the managed settings of the machine (design D2):
// it writes no managed file, offers to move the keys of an old dotclaude file into user settings,
// and prints the removal command without running it.
// Every run gets a temporary HOME, config folder, and managed folder, and an empty PATH.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  findOldManaged,
  isDotclaudeManaged,
  managedDir,
  removeCommand,
} from "../../plugins/dotclaude/features/setup/managed.mjs";

const PLUGIN = path.join(import.meta.dirname, "../../plugins/dotclaude");
const SCRIPT = path.join(PLUGIN, "skills/setup/scripts/settings.mjs");
const TRACE = path.join(import.meta.dirname, "fixtures/trace-writes.mjs");
const NODE = Bun.which("node");
const OLD = {
  $schema:
    "https://raw.githubusercontent.com/xsyetopz/dotclaude/main/schemas/claude-code-managed-settings.json",
  sandbox: { enabled: true, failIfUnavailable: true },
  permissions: { deny: ["Read(~/.old-secret)"] },
};

/** A temporary root with `config`, `managed`, and `trace` paths. `old` is written as the managed file. */
function world(old) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dc-managed-"));
  const w = {
    root,
    config: path.join(root, "config"),
    managed: path.join(root, "managed"),
    trace: path.join(root, "trace.log"),
  };
  fs.mkdirSync(w.config);
  fs.mkdirSync(w.managed);
  fs.writeFileSync(w.trace, "");
  if (old)
    fs.writeFileSync(
      path.join(w.managed, "managed-settings.json"),
      JSON.stringify(old),
    );
  return w;
}
function setup(w, ...args) {
  const r = Bun.spawnSync(
    [NODE, "--import", TRACE, SCRIPT, "--apply", ...args],
    {
      env: {
        HOME: w.root,
        CLAUDE_CONFIG_DIR: w.config,
        CLAUDE_PROJECT_DIR: w.config,
        DOTCLAUDE_MANAGED_DIR: w.managed,
        TRACE_WRITES_FILE: w.trace,
        PATH: "",
      },
    },
  );
  return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
}
const user = (w) =>
  JSON.parse(fs.readFileSync(path.join(w.config, "settings.json"), "utf8"));
const written = (w) =>
  fs.readFileSync(w.trace, "utf8").split("\n").filter(Boolean);

test("an old managed file is found by its schema name, and a foreign file is not", () => {
  expect(isDotclaudeManaged(OLD)).toBe(true);
  expect(isDotclaudeManaged({ $schema: "https://example.com/x.json" })).toBe(
    false,
  );
  expect(isDotclaudeManaged({})).toBe(false);
  const w = world(OLD);
  expect(findOldManaged(w.managed).keys).toEqual({
    sandbox: OLD.sandbox,
    permissions: OLD.permissions,
  });
  fs.writeFileSync(path.join(w.managed, "managed-settings.json"), '{"env":{}}');
  expect(findOldManaged(w.managed)).toBeNull();
  expect(findOldManaged(path.join(w.root, "none"))).toBeNull();
  expect(managedDir("darwin")).toContain("ClaudeCode");
});

test("on refusal, setup asks, leaves the keys out of user settings, and prints the removal command", () => {
  const w = world(OLD);
  const r = setup(w);
  const file = path.join(w.managed, "managed-settings.json");
  expect(r.code).toBe(0);
  expect(r.out).toContain("Question: move its keys");
  expect(r.out).toContain(removeCommand(file));
  expect(r.out).toContain("sudo rm");
  expect(user(w).permissions.deny).not.toContain("Read(~/.old-secret)");
  expect(user(w).sandbox.failIfUnavailable).toBeUndefined();
  expect(fs.existsSync(file)).toBe(true);
});

test("on consent, setup moves the keys into user settings and still changes no managed file", () => {
  const w = world(OLD);
  const file = path.join(w.managed, "managed-settings.json");
  const before = fs.readFileSync(file, "utf8");
  const r = setup(w, "--move-managed");
  expect(r.code).toBe(0);
  expect(r.out).toContain("Its keys move into user settings");
  expect(r.out).toContain(removeCommand(file));
  expect(user(w).permissions.deny).toContain("Read(~/.old-secret)");
  expect(user(w).sandbox.failIfUnavailable).toBe(true);
  expect(fs.readFileSync(file, "utf8")).toBe(before);
  expect(fs.readdirSync(w.managed)).toEqual(["managed-settings.json"]);
});

test("`--move-managed` outside user scope stops with a message", () => {
  const w = world(OLD);
  const r = setup(w, "--move-managed", "--scope", "project");
  expect(r.code).toBe(2);
  expect(r.out).toContain("--scope user");
});

test("with no old file, setup prints no managed command", () => {
  const w = world(null);
  const r = setup(w, "--move-managed");
  expect(r.code).toBe(0);
  expect(r.out).not.toContain("sudo rm");
  expect(r.out).not.toContain("managed settings file");
});

/** The folders of the Claude Code install and of its managed settings, on each platform. */
const INSTALL = [
  "/Library/Application Support/ClaudeCode",
  "/etc/claude-code",
  "C:\\Program Files\\ClaudeCode",
  "/node_modules/@anthropic-ai/claude-code",
  "/.local/share/claude",
  "/.claude/local",
];
const inInstall = (p) => INSTALL.some((dir) => p.includes(dir));

test("the install check flags a path in the Claude Code folders", () => {
  expect(inInstall("/etc/claude-code/managed-settings.json")).toBe(true);
  expect(
    inInstall("/usr/lib/node_modules/@anthropic-ai/claude-code/cli.js"),
  ).toBe(true);
  expect(inInstall("/tmp/dc/config/settings.json")).toBe(false);
});

test("no write path of setup is in the Claude Code install folder, with a managed file and all options", () => {
  const w = world(OLD);
  const r = setup(
    w,
    "--move-managed",
    "--with",
    "telemetry,nonessential-traffic",
  );
  expect(r.code).toBe(0);
  const paths = written(w);
  expect(paths.length).toBeGreaterThan(0);
  for (const p of paths) {
    expect(inInstall(p)).toBe(false);
    expect(p.startsWith(w.config)).toBe(true);
  }
  expect(r.out).not.toContain("sudo cp");
});
