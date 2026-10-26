// Pins the arm check of `claudetto-sandbox` (finding X19): the session fails when the loaded plugin or the model is not the one that the arguments name.
// A fake `claude` first on `PATH` writes the debug file, so no test starts Claude Code.

import { expect, test } from "bun:test";
import path from "node:path";
import { report } from "../../../dev/sandbox/domain/frontmatter.ts";
import { withPathFirst, writeProgram } from "../../support/fake-program.ts";
import { type Env, tmpDir } from "../../support/repo.ts";
import { spawnText } from "../fixture-repo.ts";
import { FAKE_CLAUDE, LAB, LOADED } from "./fake-claude.ts";

/** A folder that holds a plugin manifest, as a `--plugin-dir` needs. */
const pluginDir = async (parent: string, name: string): Promise<string> => {
  const dir = path.join(parent, name);
  await Bun.write(path.join(dir, ".claude-plugin", "plugin.json"), "{}");
  return dir;
};

const run = async (args: string[], env: Env, settings?: object) => {
  const dir = tmpDir("lab-arm");
  await writeProgram(dir, "claude", FAKE_CLAUDE);
  const sandbox = path.join(dir, "sandbox");
  if (settings) {
    await Bun.write(
      path.join(sandbox, "config", "settings.json"),
      JSON.stringify(settings),
    );
  }
  return {
    dir,
    ...spawnText(
      process.execPath,
      [path.join(LAB, "main.ts"), "--dir", sandbox, ...args],
      {
        env: {
          ...withPathFirst(process.env, dir),
          CLAUDE_CODE_OAUTH_TOKEN: "t",
          ...env,
        },
      },
    ),
  };
};

test("a `--plugin-dir` folder with no plugin manifest fails before the session starts", async () => {
  const r = await run(["--plugin-dir", "/nonexistent/plugin"], {});
  expect(r.status).toBe(1);
  expect(r.stderr).toContain("/nonexistent/plugin");
  expect(r.stderr).toContain("plugin.json");
});

test("a log with fewer loaded plugins than `--plugin-dir` folders fails the check", async () => {
  const dir = tmpDir("lab-arm-dirs");
  const args = [
    "--check-frontmatter",
    "--plugin-dir",
    await pluginDir(dir, "a"),
    "--plugin-dir",
    await pluginDir(dir, "b"),
  ];
  const one = await run(args, { FAKE_LOG_TEXT: `${LOADED}\n` });
  expect(one.status, one.stderr).toBe(1);
  expect(one.stdout).toMatch(/\b1\b[^\n]*\b2\b/);
  const two = await run(args, { FAKE_LOG_TEXT: `${LOADED}\n${LOADED}\n` });
  expect(two.status, two.stderr).toBe(0);
});

test("a `--model` outside `availableModels` fails the session", async () => {
  const settings = { availableModels: ["claude-haiku-5-5"] };
  const bad = await run(["--model", "claude-opus-5-5"], {}, settings);
  expect(bad.status).toBe(1);
  expect(bad.stderr).toContain("claude-opus-5-5");
  expect(bad.stderr).toContain("availableModels");
  const ok = await run(["--model", "claude-haiku-5-5"], {}, settings);
  expect(ok.status, ok.stderr).toBe(0);
});

test("`report` counts the loaded plugins against the expected count", () => {
  expect(report("log", `${LOADED}\n`, 1).code).toBe(0);
  expect(report("log", `${LOADED}\n`, 2).code).toBe(1);
  expect(report("log", "nothing\n", 1).code).toBe(1);
});
