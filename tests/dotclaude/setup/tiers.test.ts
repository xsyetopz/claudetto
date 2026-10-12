// The account tiers of `dotclaude-setup settings`: the picks that each account type gets.
// Each run puts a fake `claude` on `PATH` that prints a fixed `claude auth status --json` output.
// Each run uses a temporary `CLAUDE_CONFIG_DIR` and project folder, so no real settings file changes.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  accountOf,
  PICKS,
  picksOf,
  RATE_TIER_MAX_5X,
  RATE_TIER_MAX_20X,
} from "../../../plugins/dotclaude/slices/setup/domain/tiers.ts";
import type { Json } from "../../../plugins/dotclaude/slices/setup/domain/types.ts";
import { writeProgram } from "../../support/fake-program.ts";
import type { Env } from "../../support/repo.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";

const SCRIPT = path.join(PLUGINS, "dotclaude/bin/dotclaude-setup");

const PRO = {
  loggedIn: true,
  authMethod: "claude.ai",
  apiProvider: "firstParty",
  subscriptionType: "pro",
};
const MAX = { ...PRO, subscriptionType: "max" };
const API = {
  loggedIn: true,
  authMethod: "api_key",
  apiProvider: "firstParty",
  subscriptionType: null,
};

// The `claude auth status --json` output of each account, and the exit status of the fake program.
const ACCOUNTS: {
  name: string;
  status: Json;
  code: number;
  rateTier?: string;
  effortLevel?: string;
  subagents?: string;
}[] = [
  {
    name: "Pro",
    status: PRO,
    code: 0,
    effortLevel: "high",
    subagents: "5",
  },
  {
    name: "Max 5x",
    status: MAX,
    code: 0,
    rateTier: RATE_TIER_MAX_5X,
    effortLevel: "xhigh",
    subagents: "10",
  },
  {
    name: "Max 20x",
    status: MAX,
    code: 0,
    rateTier: RATE_TIER_MAX_20X,
    effortLevel: "xhigh",
    subagents: "20",
  },
  {
    name: "API key",
    status: API,
    code: 0,
    effortLevel: "high",
    subagents: "5",
  },
  // No picks are written, so the `prompt` pin of the snippet stays.
  { name: "no login", status: { loggedIn: false }, code: 1, subagents: "5" },
];

/** A temporary config folder, project folder, and bin folder with the fake `claude`. */
const sandbox = async (status: string, code: number) => {
  const root = tmpDir("dc-tiers");
  const d = {
    config: path.join(root, "config"),
    project: path.join(root, "project"),
    bin: path.join(root, "bin"),
  };
  for (const dir of Object.values(d)) fs.mkdirSync(dir);
  // The fake answers only `auth status --json`, and it prints the status with a token that setup must not print.
  await writeProgram(
    d.bin,
    "claude",
    `if (process.argv.slice(2).join(" ") !== "auth status --json") process.exit(2);
process.stdout.write(${JSON.stringify(status)});
process.exit(${code});
`,
  );
  return d;
};

const run = (d: Awaited<ReturnType<typeof sandbox>>, env: Env = {}) => {
  const r = Bun.spawnSync(
    [process.execPath, "--no-env-file", SCRIPT, "settings", "--apply"],
    {
      env: {
        CLAUDE_CONFIG_DIR: d.config,
        CLAUDE_PROJECT_DIR: d.project,
        PATH: d.bin,
        ...env,
      },
    },
  );
  return {
    status: r.exitCode,
    stdout: r.stdout.toString(),
    stderr: r.stderr.toString(),
  };
};

const readUser = async (d: Awaited<ReturnType<typeof sandbox>>) =>
  JSON.parse(await Bun.file(path.join(d.config, "settings.json")).text());

test("the status of a Max account gives 5x or 20x only with its rate limit tier", () => {
  expect(accountOf(MAX, RATE_TIER_MAX_5X)).toBe("max5x");
  expect(accountOf(MAX, RATE_TIER_MAX_20X)).toBe("max20x");
  // Without the rate limit tier, setup cannot tell 5x from 20x, so the Pro picks apply.
  expect(accountOf(MAX)).toBe("pro");
  expect(accountOf(MAX, "default_claude_max_1x")).toBe("pro");
});

test("a Pro, Team, or Enterprise status gives the Pro baseline", () => {
  expect(accountOf(PRO)).toBe("pro");
  expect(accountOf({ loggedIn: true, subscriptionType: "team" })).toBe("pro");
  expect(accountOf({ loggedIn: true, subscriptionType: "enterprise" })).toBe(
    "pro",
  );
});

test("a login with no subscription type gives the API key account", () => {
  expect(accountOf(API)).toBe("api");
  expect(accountOf({ authMethod: "api_key" })).toBe("api");
});

test("a status with no login, or no object, gives no account", () => {
  expect(accountOf({ loggedIn: false })).toBe("none");
  expect(accountOf({ loggedIn: false, subscriptionType: "max" })).toBe("none");
  expect(accountOf(undefined)).toBe("none");
  expect(accountOf("not an object")).toBe("none");
});

test("subagent caps scale up from Pro, and the no-login account has none", () => {
  const subagents = (account: keyof typeof PICKS) =>
    Number(
      (PICKS[account]["env"] as Json)["CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS"],
    );
  expect(subagents("max5x")).toBeGreaterThan(subagents("pro"));
  expect(subagents("max20x")).toBeGreaterThan(subagents("max5x"));
  expect(subagents("api")).toBe(subagents("pro"));
  expect(picksOf("none")).toBeUndefined();
  expect(picksOf("pro")).toBe(PICKS.pro);
});

for (const account of ACCOUNTS)
  test(`the settings of a ${account.name} account get its picks`, async () => {
    const d = await sandbox(JSON.stringify(account.status), account.code);
    const r = run(
      d,
      account.rateTier ? { CLAUDE_CODE_RATE_LIMIT_TIER: account.rateTier } : {},
    );
    expect(r.status).toBe(0);
    const settings = await readUser(d);
    expect(settings["effortLevel"]).toBe(account.effortLevel);
    expect(settings["env"]?.["CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS"]).toBe(
      account.subagents,
    );
  });

test("the status output and its token are not printed", async () => {
  const status = { ...MAX, accessToken: "sk-test-not-printed" };
  const d = await sandbox(JSON.stringify(status), 0);
  // A credentials file with a token, which setup must not open.
  await Bun.write(
    path.join(d.config, ".credentials.json"),
    JSON.stringify({ claudeAiOauth: { accessToken: "sk-test-credentials" } }),
  );
  const r = run(d, { CLAUDE_CODE_RATE_LIMIT_TIER: RATE_TIER_MAX_20X });
  expect(r.status).toBe(0);
  expect(r.stdout + r.stderr).not.toContain("sk-test");
});
