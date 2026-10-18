// The scripts of the skill `sessions` over a fixture folder in the shape of `~/.claude/`, a fixture transcript, and a tiny deny hook.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SKILL = "src/plugins/claudetto-sessions/slices/sessions/skills/sessions";
const run = (script: string, ...args: string[]) => {
  const out = Bun.spawnSync(
    [process.execPath, "--no-env-file", path.join(SKILL, script), ...args],
    { stdout: "pipe", stderr: "pipe" },
  );
  return { status: out.exitCode, out: out.stdout.toString() };
};
const put = (file: string, text: string) => Bun.write(file, text);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "sessions-"));
const home = path.join(root, ".claude");
const project = path.join(root, "project");
await put(
  path.join(home, "settings.json"),
  JSON.stringify({
    model: "x",
    enabledPlugins: { "a@m": true },
    hooks: { PreToolUse: [{}, {}] },
  }),
);
await put(path.join(project, ".claude/settings.local.json"), '{"env":{}}');
await put(path.join(home, "CLAUDE.md"), "12345");
await put(path.join(project, ".claude/rules/r.md"), "abc");
await put(
  path.join(project, ".claude/rules/p.md"),
  "---\npaths:\n  - a\n---\nxx\n",
);
await put(path.join(root, "managed.json"), '{"model":"m"}');
await put(
  path.join(home, "skills/s/SKILL.md"),
  "---\nname: s\ndescription: does it\n---\nbody that is not counted\n",
);

test("`audit` lists layers, plugins, hooks, and bytes", () => {
  const r = run(
    "audit.ts",
    "--home",
    home,
    "--project",
    project,
    "--managed",
    path.join(root, "managed.json"),
  );
  expect(r.status).toBe(0);
  const json = JSON.parse(r.out);
  expect(json.settings).toStrictEqual({
    user: ["enabledPlugins", "hooks", "model"],
    managed: ["model"],
    local: ["env"],
  });
  expect(json.plugins).toStrictEqual({ "a@m": true });
  expect(json.hooks.user).toStrictEqual({ PreToolUse: 2 });
  expect(json.bytes.memory[path.join(home, "CLAUDE.md")]).toBe(5);
  expect(json.bytes.rules[path.join(project, ".claude/rules/r.md")]).toBe(3);
  expect(Object.keys(json.bytes.onMatch)).toStrictEqual([
    path.join(project, ".claude/rules/p.md"),
  ]);
  expect(Object.keys(json.bytes.onMatch)).toStrictEqual([
    path.join(project, ".claude/rules/p.md"),
  ]);
  expect(json.bytes.skills[path.join(home, "skills/s/SKILL.md")]).toBe(
    "s: does it".length,
  );
});

test("`replay` counts the calls and the denies of a hook module", async () => {
  const hook = path.join(root, "hook.ts");
  await put(
    hook,
    "export const check = (e, prior) =>\n  e.tool_input.command?.startsWith('npm') ? { deny: 'prior ' + prior.length } : {};\n",
  );
  const use = (name: string, input: object) =>
    JSON.stringify({
      type: "assistant",
      cwd: "/p",
      sessionId: "s1",
      message: { content: [{ type: "tool_use", name, input }] },
    });
  await put(
    path.join(root, "projects/p/s1.jsonl"),
    [
      JSON.stringify({ type: "user", message: { content: "hi" } }),
      "not json",
      use("Bash", { command: "npm test" }),
      use("Bash", { command: "bun test" }),
      JSON.stringify({ type: "user", message: { content: "hi" } }),
    ].join("\n"),
  );
  const r = run("replay.ts", hook, path.join(root, "projects"));
  expect(r.status).toBe(0);
  const json = JSON.parse(r.out);
  expect([json.calls, json.denies]).toStrictEqual([2, 1]);
  expect(json.shown[0].reason).toBe("prior 1");
});

test("`replay` with a missing projects folder fails with a message", () => {
  expect(run("replay.ts", "x.ts", path.join(root, "none")).status).toBe(1);
});

test("`replay` without a module fails", () => {
  expect(run("replay.ts").status).toBe(2);
});

test("`replay` with `--help` prints the usage and exits 0", () => {
  const r = run("replay.ts", "--help");
  expect(r.status).toBe(0);
  expect(r.out).toContain("Usage: bun replay.ts HOOK_MODULE");
});
