// The `off` lists of the `prompt` slice equal the `off` rows of the verdict tables,
// except the rows that a setting of the snippet already covers.

import { expect, test } from "bun:test";
import { OFF_ATTACHMENTS, OFF_COMMANDS } from "../../../plugins/claudetto/slices/prompt/domain/off.ts";
import { slice } from "../../../plugins/claudetto/slices/prompt/slice.ts";
import { slice as setup } from "../../../plugins/claudetto/slices/setup/slice.ts";
import { VERDICTS } from "../../../tools/builtins/verdicts.ts";

/** The names of a list, sorted. */
const sorted = (list: readonly string[]): string[] => [...list].sort();

/** The names of the `off` rows of one group. */
const offNames = (group: string): string[] =>
  Object.entries(VERDICTS)
    .filter(([key, v]) => key.startsWith(`${group}:`) && v.verdict === "off")
    .map(([key]) => key.slice(group.length + 1))
    .sort();

/** The settings of the snippet that `prompt` and `setup` set together. */
const env: Record<string, string> = {
  ...setup.settings.env,
  ...slice.settings.env,
};
const key = slice.settings as unknown as Record<string, unknown>;
const deny = slice.settings.permissions.deny;

/** An `off` row that a setting covers, with the setting: an `env` name, a settings key, or a deny rule. */
const COVERED: Record<string, { env?: string; key?: string; deny?: string }> = {
  "attachments:session_cron_carry": { env: "CLAUDE_CODE_DISABLE_CRON" },
  "attachments:task_reminder": { deny: "TaskUpdate" },
  "attachments:workflow_keyword_request": { key: "enableWorkflows" },
  "commands:artifacts": { key: "enableArtifact" },
  "commands:extra-usage": { env: "DISABLE_EXTRA_USAGE_COMMAND" },
  "commands:usage-credits": { env: "DISABLE_EXTRA_USAGE_COMMAND" },
  "commands:upgrade": { env: "DISABLE_UPGRADE_COMMAND" },
  "commands:install-github-app": { env: "DISABLE_INSTALL_GITHUB_APP_COMMAND" },
  "commands:fast": { env: "CLAUDE_CODE_DISABLE_FAST_MODE" },
  "commands:remote-control": { key: "disableRemoteControl" },
  "commands:workflows": { key: "enableWorkflows" },
};

/** The names of the `off` rows of one group that no setting covers. */
const hooked = (group: string): string[] =>
  offNames(group).filter((name) => !(`${group}:${name}` in COVERED));

test("the `off` attachment kinds equal the `off` rows that no setting covers", () => {
  expect(sorted(OFF_ATTACHMENTS)).toStrictEqual(hooked("attachments"));
});

test("the hidden commands equal the `off` rows that no setting covers", () => {
  expect(sorted(OFF_COMMANDS)).toStrictEqual(hooked("commands"));
});

test("each covered `off` row has its setting in the snippet", () => {
  for (const [row, how] of Object.entries(COVERED)) {
    expect(VERDICTS[row]?.verdict).toBe("off");
    if (how.env) expect(env[how.env]).toBeDefined();
    if (how.key) expect(key[how.key]).toBeDefined();
    if (how.deny) expect(deny).toContain(how.deny);
  }
});

test("the `false` entries of `enabledPlugins` are the `off` plugin rows", () => {
  const off = Object.entries(slice.settings.enabledPlugins)
    .filter(([, on]) => on === false)
    .map(([key]) => key);
  expect(sorted(off)).toStrictEqual(
    offNames("plugins").map((name) => `cc-plugin-${name}@builtin`),
  );
});
