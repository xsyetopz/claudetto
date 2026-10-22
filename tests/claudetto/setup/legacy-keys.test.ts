// The cleanup of the settings keys that claudetto 0.1.0 and 0.2.0 wrote and later versions no longer write.
// The 0.1.0 list comes from the snippet of the tag `claudetto--v0.1.0-alpha.1` against the snippet of 0.2.0.
// The 0.2.0 snippet is the snippet of the tag `claudetto--v0.2.0`.

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/slices/setup/adapters/cli.ts";
import OLD from "../../../plugins/claudetto/slices/setup/snippet-0.2.0.json";

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

test("setup removes the `ask` rules that only 0.1.0 wrote", async () => {
  const out = await run({
    env: { MY_VAR: "keep" },
    permissions: { ask: [...ASK_0_1_0, "Bash(my ask *)"] },
  });
  expect(out.env.MY_VAR).toBe("keep");
  for (const rule of ASK_0_1_0) expect(out.permissions.ask).not.toContain(rule);
  expect(out.permissions.ask).toContain("Bash(my ask *)");
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

test("setup keeps one `ask` rule of the user when the other 0.1.0 rules are not there", async () => {
  const out = await run({ permissions: { ask: ["Bash(git reset --hard*)"] } });
  expect(out.permissions.ask).toContain("Bash(git reset --hard*)");
});

test("the dry run lists each `ask` rule that it removes", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "legacy-"));
  await Bun.write(
    path.join(dir, "settings.json"),
    JSON.stringify({ permissions: { ask: ASK_0_1_0 } }),
  );
  const lines: string[] = [];
  const io = { log: (l: string) => lines.push(l), error: () => {} };
  const env = { CLAUDE_CONFIG_DIR: dir, CLAUDE_PROJECT_DIR: dir };
  expect(await main(["--scope", "user"], env, dir, io)).toBe(0);
  const text = lines.join("\n");
  for (const rule of ASK_0_1_0) expect(text).toContain(`\`${rule}\``);
});

test("setup removes the values of 0.2.0, and keeps the values that the user changed or added", async () => {
  const { sandbox, permissions } = OLD;
  const ask = permissions.ask.slice(1);
  const out = await run({
    ...OLD,
    sandbox: {
      ...sandbox,
      enabled: false,
      network: {
        ...sandbox.network,
        allowedDomains: [...sandbox.network.allowedDomains, "example.com"],
      },
    },
    permissions: { ...permissions, ask },
  });
  expect(out.sandbox).toStrictEqual({
    enabled: false,
    network: { allowedDomains: ["example.com"] },
  });
  expect(out.permissions.ask).toStrictEqual(ask);
  expect(out.permissions.deny).not.toContain("TaskStop");
  expect(out.permissions).not.toHaveProperty("allow");
  expect(out).not.toHaveProperty("syncClaudeAiSkills");
});

test("setup leaves `cc-plugin-you-should-know@builtin` to the user: it removes the `false` of 0.2.0 and keeps a `true` of the user", async () => {
  const key = "cc-plugin-you-should-know@builtin";
  expect((await run(OLD)).enabledPlugins).not.toHaveProperty(key);
  const mine = await run({
    ...OLD,
    enabledPlugins: { ...OLD.enabledPlugins, [key]: true },
  });
  expect(mine.enabledPlugins[key]).toBe(true);
});
