// The `setup` CLI: the settings snippet, and the removal of the deny rules of 0.3.0-alpha.1.
// Each test runs `main` in a temp folder with its own config folder.

import { expect, test } from "bun:test";
import {
  HAIKU_AUTOCOMPACT_WINDOW,
  MCP_DESCRIPTION_MAX_CHARS,
} from "../../../plugins/claudetto/kernel/budget.ts";
import { main } from "../../../plugins/claudetto/slices/setup/adapters/cli.ts";
import {
  DROPPED_DENY,
  SNIPPET,
} from "../../../plugins/claudetto/slices/setup/prompts.ts";
import { runSetup } from "../../support/setup-run.ts";

/** Runs `claudetto-setup --scope user --apply` on `settings`, and gives the file after the run and the printed text. */
const run = (settings: object) =>
  runSetup({ "settings.json": JSON.stringify(settings) });

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

test("Fresh Install: an empty file gets the off switches, the agent denies, the model caps, and the MCP bound, and no `IS_DEMO`", async () => {
  const { settings } = await run({});
  expect(settings).toMatchObject({
    syncClaudeAiSkills: false,
    syncClaudeAiPlugins: false,
    idleCompaction: false,
    disableAgentView: true,
    enabledPlugins: { "cc-plugin-you-should-know@builtin": false },
    modelSettings: {
      "claude-opus-5-5": { maxEffortLevel: "high" },
      "claude-sonnet-5-5": { maxEffortLevel: "medium" },
      "claude-haiku-5-5": { autoCompactWindow: HAIKU_AUTOCOMPACT_WINDOW },
    },
    env: {
      ENABLE_CLAUDEAI_MCP_SERVERS: "false",
      CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "1",
      CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH: String(MCP_DESCRIPTION_MAX_CHARS),
    },
  });
  for (const name of ["claude", "claude-code-guide", "general-purpose"])
    expect(settings.permissions.deny).toContain(`Agent(${name})`);
  expect(settings.env).not.toHaveProperty("IS_DEMO");
  expect(settings.permissions.deny).not.toContain("TaskStop");
});

test("Upgrade from Alpha 1: setup removes `Bash(rm -rf /*)` and `Bash(rm -rf ~/*)`, lists both, and keeps the other rules", async () => {
  const deny = [...SNIPPET.permissions.deny, ...DROPPED_DENY, "Read(./x)"];
  const { settings, text } = await run({ permissions: { deny } });
  for (const rule of DROPPED_DENY) {
    expect(settings.permissions.deny).not.toContain(rule);
    expect(text).toContain(`\`${rule}\``);
  }
  expect(settings.permissions.deny).toContain("Read(./x)");
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
