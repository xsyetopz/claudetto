// The `--advisor` argument of `claudetto-setup`: only the value `claudetto` turns off the built-in advisor.

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/slices/setup/adapters/cli.ts";

/** Runs `claudetto-setup --apply` with `extra` args in a temp folder, and returns the exit status and `env` of the settings. */
const run = async (extra: string[]) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "setup-advisor-"));
  const io = { log: () => {}, error: () => {} };
  const env = { CLAUDE_CONFIG_DIR: dir, CLAUDE_PROJECT_DIR: dir };
  const status = await main(["--apply", ...extra], env, dir, io);
  const file = Bun.file(path.join(dir, "settings.json"));
  return { status, env: status === 0 ? (await file.json()).env : undefined };
};

test("with `--advisor claudetto`, the snippet sets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` to `1`", async () => {
  const { env } = await run(["--advisor", "claudetto"]);
  expect(env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL).toBe("1");
  expect(env.CLAUDE_CODE_DISABLE_CRON).toBe("1");
});

test("with `--advisor builtin` or no argument, the snippet does not set `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`", async () => {
  for (const extra of [["--advisor", "builtin"], []])
    expect(
      (await run(extra)).env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL,
    ).toBeUndefined();
});

test("an unknown `--advisor` value is a usage error", async () => {
  expect((await run(["--advisor", "x"])).status).toBe(2);
  expect((await run(["--advisor"])).status).toBe(2);
});
