// The cleanup of the settings keys that claudetto 0.1.0 wrote and 0.2.0 no longer writes.
// The list comes from the snippet of the tag `claudetto--v0.1.0-alpha.1` against the snippet of 0.2.0.

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/slices/setup/adapters/cli.ts";

const ASK_0_1_0 = [
  "Bash(git push *--force*)",
  "Bash(git push -f*)",
  "Bash(git push * -f)",
  "Bash(git push * -f *)",
  "Bash(git reset --hard*)",
  "Bash(git clean -f*)",
  "Bash(git clean -d*)",
  "Bash(git branch -D *)",
  "Bash(git checkout -- *)",
  "Bash(git restore *)",
];

/** Runs `claudetto-setup --scope user --apply` on `settings` and returns the file after the run. */
const run = async (settings: object) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "legacy-"));
  const file = path.join(dir, "settings.json");
  await Bun.write(file, JSON.stringify(settings));
  const io = { log: () => {}, error: () => {} };
  const env = { CLAUDE_CONFIG_DIR: dir, CLAUDE_PROJECT_DIR: dir };
  expect(await main(["--scope", "user", "--apply"], env, dir, io)).toBe(0);
  return Bun.file(file).json();
};

test("setup removes the env key and the `ask` rules that only 0.1.0 wrote", async () => {
  const out = await run({
    env: {
      CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "1",
      MY_VAR: "keep",
    },
    permissions: { ask: [...ASK_0_1_0, "Bash(my ask *)"] },
  });
  expect(out.env).not.toHaveProperty("CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS");
  expect(out.env.MY_VAR).toBe("keep");
  for (const rule of ASK_0_1_0) expect(out.permissions.ask).not.toContain(rule);
  expect(out.permissions.ask).toContain("Bash(my ask *)");
});

test("setup keeps an env key of the user that has another value than 0.1.0 wrote", async () => {
  const out = await run({
    env: { CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "0" },
  });
  expect(out.env.CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS).toBe("0");
});

test("setup keeps the other keys of the user, such as `deny` and `theme`", async () => {
  const out = await run({
    theme: "dark",
    permissions: {
      deny: ["Read(./secret)"],
      ask: ["Bash(git push *--force*)"],
    },
  });
  expect(out.theme).toBe("dark");
  expect(out.permissions.deny).toContain("Read(./secret)");
});
