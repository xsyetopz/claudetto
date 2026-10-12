// Runs of `dotclaude-setup settings` for the destructive floor: the `hard_deny` and `soft_deny` lists that come from the rule catalog.
// Each run uses a temporary `CLAUDE_CONFIG_DIR` and project folder, so no real settings file changes.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { POLICY_RULES } from "../../../src/kernel/policy/index.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";

type Sandbox = { config: string; project: string; bin: string };

const PLUGIN = path.join(PLUGINS, "dotclaude");
const SCRIPT = path.join(PLUGIN, "bin/dotclaude-setup");

/** A temporary config folder, project folder, and an empty `PATH` folder. */
const sandbox = (): Sandbox => {
  const root = tmpDir("dc-floor");
  const d = {
    config: path.join(root, "config"),
    project: path.join(root, "project"),
    bin: path.join(root, "bin"),
  };
  for (const dir of Object.values(d)) fs.mkdirSync(dir);
  return d;
};

const run = (d: Sandbox, args: string[]) => {
  const r = Bun.spawnSync(
    [process.execPath, "--no-env-file", SCRIPT, "settings", ...args],
    {
      env: {
        CLAUDE_CONFIG_DIR: d.config,
        CLAUDE_PROJECT_DIR: d.project,
        PATH: d.bin,
      },
    },
  );
  return {
    status: r.exitCode,
    stdout: r.stdout.toString(),
    stderr: r.stderr.toString(),
  };
};

const userFile = (d: Sandbox) => path.join(d.config, "settings.json");
const readUser = async (d: Sandbox) =>
  JSON.parse(await Bun.file(userFile(d)).text());
const writeUser = (d: Sandbox, value: object) =>
  Bun.write(userFile(d), JSON.stringify(value, null, 2));

const proseOf = (tier: string) =>
  POLICY_RULES.filter((rule) => rule.tier === tier).map((rule) => rule.prose);

test("`--apply` writes `hard_deny` with `$defaults` first and one entry for each floor and subagent rule", async () => {
  const d = sandbox();
  expect(run(d, ["--apply"]).status).toBe(0);
  const hard = (await readUser(d)).autoMode.hard_deny;
  expect(hard[0]).toBe("$defaults");
  expect(hard.slice(1)).toStrictEqual([
    ...proseOf("floor"),
    ...proseOf("subagent"),
  ]);
});

test("`--apply` writes `soft_deny` with `$defaults` first and one entry for each ask rule", async () => {
  const d = sandbox();
  expect(run(d, ["--apply"]).status).toBe(0);
  const soft = (await readUser(d)).autoMode.soft_deny;
  expect(soft[0]).toBe("$defaults");
  expect(soft.slice(1)).toStrictEqual(proseOf("ask"));
});

test("a declined block writes nothing, and the dry run shows the `hard_deny` change", () => {
  const d = sandbox();
  const r = run(d, []);
  expect(r.status).toBe(0);
  expect(fs.existsSync(userFile(d))).toBe(false);
  expect(r.stdout).toContain("autoMode.hard_deny");
});

test("`--apply` keeps the user's other settings and the user's own deny entries", async () => {
  const d = sandbox();
  await writeUser(d, {
    theme: "dark",
    autoMode: {
      hard_deny: ["Custom deny"],
      soft_deny: ["$defaults", "Custom ask"],
    },
  });
  expect(run(d, ["--apply"]).status).toBe(0);
  const user = await readUser(d);
  expect(user.theme).toBe("dark");
  expect(user.autoMode.hard_deny).toStrictEqual([
    "$defaults",
    "Custom deny",
    ...proseOf("floor"),
    ...proseOf("subagent"),
  ]);
  expect(user.autoMode.soft_deny).toStrictEqual([
    "$defaults",
    "Custom ask",
    ...proseOf("ask"),
  ]);
});

test("a second `--apply` adds no duplicate entry to a list", async () => {
  const d = sandbox();
  run(d, ["--apply"]);
  const before = await Bun.file(userFile(d)).text();
  expect(run(d, ["--apply"]).status).toBe(0);
  expect(await Bun.file(userFile(d)).text()).toBe(before);
  const user = await readUser(d);
  expect(new Set(user.autoMode.hard_deny).size).toBe(
    user.autoMode.hard_deny.length,
  );
});
