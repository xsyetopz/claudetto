// The `setup` CLI: the settings snippet, and the cleanup of the keys that claudetto 0.1.0 wrote.
// Each test runs `main` in a temp folder with its own config folder.

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/slices/setup/adapters/cli.ts";

const BLOCK = "<!-- claudetto:begin -->\nold rules\n<!-- claudetto:end -->";

/** Runs `claudetto-setup --scope user --apply` on `settings` and `claudeMd`, and returns the files after the run. */
const run = async (settings: object, claudeMd?: string) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "setup-"));
  const file = path.join(dir, "settings.json");
  await Bun.write(file, JSON.stringify(settings));
  const md = path.join(dir, "CLAUDE.md");
  if (claudeMd !== undefined) await Bun.write(md, claudeMd);
  const io = { log: () => {}, error: () => {} };
  const env = { CLAUDE_CONFIG_DIR: dir, CLAUDE_PROJECT_DIR: dir };
  expect(await main(["--scope", "user", "--apply"], env, dir, io)).toBe(0);
  return {
    settings: await Bun.file(file).json(),
    claudeMd: (await Bun.file(md).exists())
      ? await Bun.file(md).text()
      : undefined,
  };
};

test("the snippet holds no `promptCacheTtl` and no `subagentPromptCacheTtl`", async () => {
  const { settings } = await run({});
  expect(settings).not.toHaveProperty("promptCacheTtl");
  expect(settings).not.toHaveProperty("subagentPromptCacheTtl");
});

test("the snippet keeps the keys of the user, and a second run changes nothing", async () => {
  const first = (await run({ theme: "dark", env: { A: "1" } })).settings;
  expect(first.theme).toBe("dark");
  expect(first.env.A).toBe("1");
  expect(first.env.CLAUDE_CODE_DISABLE_CRON).toBe("1");
  expect((await run(first)).settings).toStrictEqual(first);
});

/** The eight pairs that 0.1.0 wrote for the two hooks. */
const PAIRS_0_1_0: [string, string][] = [
  ["hook.claudetto-attribution.event", "commit-msg"],
  ["hook.claudetto-attribution.command", "script"],
  ["hook.claudetto-attribution.enabled", "true"],
  ["hook.commit-msg.enabled", "true"],
  ["hook.claudetto-policy.event", "pre-push"],
  ["hook.claudetto-policy.command", "script"],
  ["hook.claudetto-policy.enabled", "true"],
  ["hook.pre-push.enabled", "true"],
];

test("the cleanup removes the eight git config pairs of 0.1.0 from `env`, and keeps the pair of the user", async () => {
  const pairs = [["user.name", "Ann"], ...PAIRS_0_1_0];
  const env = Object.fromEntries([
    ["GIT_CONFIG_COUNT", String(pairs.length)],
    ...pairs.flatMap(([k, v], i) => [
      [`GIT_CONFIG_KEY_${i}`, k],
      [`GIT_CONFIG_VALUE_${i}`, v],
    ]),
  ]);
  const { settings } = await run({ env });
  const git = Object.entries(settings.env).filter(([k]) =>
    k.startsWith("GIT_CONFIG"),
  );
  expect(Object.fromEntries(git)).toStrictEqual({
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "user.name",
    GIT_CONFIG_VALUE_0: "Ann",
  });
});

test("the cleanup removes `GIT_CONFIG_COUNT` when only the pairs of claudetto were there", async () => {
  const { settings } = await run({
    env: {
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "hook.claudetto-policy.event",
      GIT_CONFIG_VALUE_0: "pre-push",
    },
  });
  expect(Object.keys(settings.env).filter((k) => k.startsWith("GIT"))).toEqual(
    [],
  );
});

test("the cleanup removes the claudetto block of `CLAUDE.md`, and keeps the text of the user", async () => {
  const { claudeMd } = await run({}, `# Mine\n\n${BLOCK}\n`);
  expect(claudeMd).toBe("# Mine\n");
});

test('the cleanup removes `promptCacheTtl: "5m"`, and keeps other values', async () => {
  const { settings } = await run({ promptCacheTtl: "5m" });
  expect(settings.promptCacheTtl).toBeUndefined();
  expect((await run({ promptCacheTtl: "1h" })).settings.promptCacheTtl).toBe(
    "1h",
  );
});

test("`--help` and an unknown flag such as `--aply` return 2 with the usage and write nothing", async () => {
  for (const flag of ["--help", "--aply"]) {
    const lines: string[] = [];
    const io = {
      log: (l: string) => lines.push(l),
      error: (l: string) => lines.push(l),
    };
    expect(await main([flag], {}, "/nonexistent", io)).toBe(2);
    expect(lines.join("\n")).toContain("claudetto-setup");
  }
});
