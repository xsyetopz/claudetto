// Runs of `skills/setup/scripts/settings.mjs` for the 0.28.0 profile:
// the migration of a 0.27.0 file, the retention value, the diff before a write, and the scope of each key.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lineDiff } from "../../plugins/dotclaude/features/setup/diff.mjs";
import { launcherText } from "../../plugins/dotclaude/features/setup/rules.mjs";
import { splitProfile } from "../../plugins/dotclaude/features/setup/scope.mjs";

const PLUGIN = path.join(import.meta.dirname, "../../plugins/dotclaude");
const SCRIPT = path.join(PLUGIN, "skills/setup/scripts/settings.mjs");
const NODE = Bun.which("node");
const OLD = JSON.parse(
  fs.readFileSync(
    path.join(import.meta.dirname, "fixtures/profile-0.27.0.json"),
    "utf8",
  ),
);
const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "dc-profile-"));

/** One run of the setup script. `env` adds to the empty environment. */
function setup(config, args, env = {}) {
  const r = Bun.spawnSync([NODE, SCRIPT, ...args], {
    env: {
      CLAUDE_CONFIG_DIR: config,
      CLAUDE_PROJECT_DIR: config,
      PATH: "",
      ...env,
    },
  });
  return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
}
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const readSettings = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

/** A 0.27.0 user file: the 0.27.0 profile, its status line and stub, and a key of the user. */
function install027(config) {
  const stub = path.join(config, "dotclaude/statusline.mjs");
  fs.mkdirSync(path.dirname(stub), { recursive: true });
  // The 0.27.0 stub ran the script in the folder `status-line` of the newest cached version.
  fs.writeFileSync(
    stub,
    launcherText(
      path.join(config, "cache/dotclaude/0.27.0/status-line/statusline.mjs"),
    ),
  );
  const file = path.join(config, "settings.json");
  write(file, {
    ...OLD,
    statusLine: {
      type: "command",
      command: `node ${JSON.stringify(stub)}`,
      padding: 0,
    },
    theme: "dark",
  });
  return { file, stub };
}

test("the fixture is the `0.27.0` profile", () => {
  expect(OLD.maxEffortLevel).toBe("xhigh");
  expect(OLD.cleanupPeriodDays).toBe(14);
  expect(OLD.availableModels).toContain("claude-haiku-4-5");
  expect(OLD.env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe("claude-haiku-4-5");
});

test("a `0.27.0` file shows the diff, and changes only after the apply", () => {
  const config = tempDir();
  const { file, stub } = install027(config);
  const before = fs.readFileSync(file, "utf8");
  const oldStub = fs.readFileSync(stub, "utf8");

  const declined = setup(config, []);
  expect(declined.code).toBe(0);
  expect(declined.out).toContain("Dry run.");
  expect(declined.out).toContain(`Diff of ${file}:`);
  expect(declined.out).toContain('-   "maxEffortLevel": "xhigh"');
  expect(declined.out).toContain('+   "maxEffortLevel": "max"');
  expect(declined.out).toContain('-     "claude-haiku-4-5"');
  expect(fs.readFileSync(file, "utf8")).toBe(before);
  expect(fs.readFileSync(stub, "utf8")).toBe(oldStub);
  expect(fs.readdirSync(config).filter((f) => f.includes("backup"))).toEqual(
    [],
  );

  expect(setup(config, ["--apply"]).code).toBe(0);
  const s = readSettings(file);
  expect(s.maxEffortLevel).toBe("max");
  expect(s.availableModels).not.toContain("claude-haiku-4-5");
  expect(s.availableModels).toContain("claude-haiku-5-5");
  expect(s.env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBeUndefined();
  expect(s.enforceAvailableModels).toBe(true);
  expect(s.subagentPromptCacheTtl).toBeUndefined();
  expect(s.theme).toBe("dark");
  expect(s.statusLine.command).toContain(stub);
  expect(fs.readFileSync(stub, "utf8")).toContain(
    "features/statusline/cli.mjs",
  );
  expect(fs.readFileSync(stub, "utf8")).not.toContain("status-line/");
  fs.rmSync(config, { recursive: true });
});

test("setup moves a `0.27.0` status line entry to the new entry as a whole", () => {
  const config = tempDir();
  const { file, stub } = install027(config);
  const s = readSettings(file);
  s.statusLine.refreshInterval = 99;
  write(file, s);
  const dry = setup(config, []);
  expect(dry.out).toContain("statusLine:");
  expect(setup(config, ["--apply"]).code).toBe(0);
  expect(readSettings(file).statusLine).toEqual({
    type: "command",
    command: `node ${JSON.stringify(stub)}`,
    padding: 0,
    refreshInterval: 1,
    hideVimModeIndicator: true,
  });
  fs.rmSync(config, { recursive: true });
});

test("a `0.27.0` file gets the subagent status line and its stub", () => {
  const config = tempDir();
  const { file } = install027(config);
  expect(readSettings(file).subagentStatusLine).toBeUndefined();
  expect(setup(config, ["--apply"]).code).toBe(0);
  const subStub = path.join(config, "dotclaude/subagent-statusline.mjs");
  expect(readSettings(file).subagentStatusLine).toEqual({
    type: "command",
    command: `node ${JSON.stringify(subStub)}`,
  });
  expect(fs.readFileSync(subStub, "utf8")).toContain("subagent-cli.mjs");
  fs.rmSync(config, { recursive: true });
});

test("`cleanupPeriodDays`: the value of the user stays, and `14` goes only after the answer", () => {
  const cases = [
    [400, [], 400],
    [undefined, [], undefined],
    [14, [], 14],
    [14, ["--remove-cleanup-period"], undefined],
    [400, ["--remove-cleanup-period"], 400],
  ];
  for (const [had, flags, want] of cases) {
    const config = tempDir();
    const file = path.join(config, "settings.json");
    write(
      file,
      had === undefined ? { theme: "dark" } : { cleanupPeriodDays: had },
    );
    const run = setup(config, ["--apply", ...flags]);
    expect(run.code).toBe(0);
    expect(readSettings(file).cleanupPeriodDays).toBe(want);
    const asked = run.out.includes("Question: cleanupPeriodDays is 14");
    expect(asked).toBe(had === 14 && !flags.length);
    if (asked) expect(run.out).toContain("cannot come back");
    fs.rmSync(config, { recursive: true });
  }
});

test("`lineDiff` shows the changed lines with context, and nothing for equal text", () => {
  expect(lineDiff("a\nb\nc", "a\nb\nc")).toEqual([]);
  expect(lineDiff("a\nb\nc\nd\ne\nf\ng\nh", "a\nB\nc\nd\ne\nf\ng\nh")).toEqual([
    "  a",
    "- b",
    "+ B",
    "  c",
    "  d",
  ]);
});

test("project scope sends a key that project settings ignore to local settings", () => {
  const profile = { syncClaudeAiSkills: false, model: "m" };
  expect(splitProfile(profile, "project")).toEqual([
    { scope: "project", profile: { model: "m" }, moved: [] },
    {
      scope: "local",
      profile: { syncClaudeAiSkills: false },
      moved: ["syncClaudeAiSkills"],
    },
  ]);
  expect(splitProfile(profile, "user")).toEqual([
    { scope: "user", profile, moved: [] },
  ]);
  expect(splitProfile({ model: "m" }, "project")).toHaveLength(1);

  const config = tempDir();
  const project = tempDir();
  const profileFile = path.join(config, "profile.json");
  write(profileFile, profile);
  const run = setup(
    config,
    ["--scope", "project", "--profile", profileFile, "--apply"],
    {
      CLAUDE_PROJECT_DIR: project,
    },
  );
  expect(run.code).toBe(0);
  const projectFile = path.join(project, ".claude/settings.json");
  const localFile = path.join(project, ".claude/settings.local.json");
  expect(readSettings(projectFile).syncClaudeAiSkills).toBeUndefined();
  expect(readSettings(projectFile).model).toBe("m");
  expect(readSettings(localFile).syncClaudeAiSkills).toBe(false);
  expect(run.out).toContain(
    `syncClaudeAiSkills: written to ${localFile} (local settings)`,
  );
  fs.rmSync(config, { recursive: true });
  fs.rmSync(project, { recursive: true });
});
