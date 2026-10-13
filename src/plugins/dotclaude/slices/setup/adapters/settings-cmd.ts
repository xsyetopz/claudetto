// The `settings` command of `dotclaude-setup`: merge the settings snippet into a Claude Code settings file.
// Without `--apply`, it prints the changes and writes nothing.
// When the cached model catalog of the account offers `claude-mythos-5-1`, it goes in place of `claude-fable-5-1` in `availableModels`.
// A list that already holds `claude-mythos-5-1` also keeps it.
// The status line commands get the absolute path of the plugin folder, because a status line command gets no `${CLAUDE_PLUGIN_ROOT}`.
// The path holds the plugin version, so run setup again after each plugin update.
// The tier picks follow the account that `claude auth status --json` names, and an account with no login gets none.
// With `--advisor`, it sets `advisorModel` to the top model of `availableModels`, because the user asked for the advisor.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeAtomic } from "../../../../../kernel/node/fs.ts";
import * as paths from "../../../../../kernel/paths.ts";
import { MYTHOS } from "../domain/merge.ts";
import { hasDocsAddon, planSettings } from "../domain/settings.ts";
import { picksOf } from "../domain/tiers.ts";
import { readAccount } from "./account.ts";
import {
  mythosInCatalog,
  type Places,
  readOptional,
  settingsFile,
} from "./files.ts";
import type { Io } from "./io.ts";

/** The parsed settings file `file`, or `{}` when it is missing. Throws on text that is not JSON. */
const readSettings = async (file: string): Promise<unknown> =>
  fs.existsSync(file) ? JSON.parse(await Bun.file(file).text()) : {};

/** Run the `settings` command and return the exit status. */
export const settingsCommand = async (
  {
    scope,
    apply,
    advisor = false,
  }: { scope: string; apply: boolean; advisor?: boolean },
  places: Places,
  env: NodeJS.ProcessEnv,
  io: Io,
): Promise<number> => {
  const { configDir, projectDir, root } = places;
  const file = settingsFile(scope, configDir, projectDir);
  if (!file) {
    io.error(`Unknown scope "${scope}". Use user, project, or local.`);
    return 2;
  }
  const withDocs = hasDocsAddon(
    await readOptional(path.join(configDir, paths.SETTINGS_FILE)),
    await readOptional(
      path.join(configDir, "plugins", "installed_plugins.json"),
    ),
  );
  // Claude Code keeps `.claude.json` in `CLAUDE_CONFIG_DIR` when it is set, and in the home folder otherwise.
  const account = await readOptional(
    env["CLAUDE_CONFIG_DIR"]
      ? path.join(configDir, paths.CLAUDE_STATE_FILE)
      : path.join(os.homedir(), paths.CLAUDE_STATE_FILE),
  );
  const mythos = await mythosInCatalog(
    path.join(configDir, "cache", "model-catalog"),
    (account["oauthAccount"] as { organizationUuid?: unknown } | undefined)
      ?.organizationUuid,
  );
  const tier = readAccount(env);
  let plan: ReturnType<typeof planSettings>;
  try {
    plan = planSettings(await readSettings(file), root, {
      withDocs,
      mythos,
      skipStatusLines: scope === "project",
      autoMode: scope === "user",
      picks: picksOf(tier),
      advisor,
    });
  } catch (err) {
    io.error(`${file}: ${(err as Error).message} Nothing changed.`);
    return 1;
  }
  io.log(`Target: ${file} (${scope} scope)`);
  io.log(`Plugin folder: ${root}`);
  if (withDocs) io.log("Adds the lines for the `dotclaude-docs` add-on.");
  if (mythos) io.log(`The model catalog of the account offers ${MYTHOS}.`);
  io.log(`Account tier: ${tier}.`);
  if (advisor)
    io.log(
      `Sets advisorModel to ${plan.settings["advisorModel"]}. Each request of the session and of each subagent then has about 1,358 tokens more, and each advisor call sends the whole history of the agent to the advisor model.`,
    );
  if (scope === "project")
    io.log(
      "Project settings get no status line, because its command holds an absolute path of this computer. Run setup with the user or local scope for it.",
    );
  for (const key of plan.kept)
    io.log(`Kept your ${key}, because it runs another tool.`);
  io.log(
    plan.changes.length
      ? `${plan.changes.length} change(s):`
      : "Settings match the snippet.",
  );
  for (const line of plan.changes) io.log(`  ${line}`);
  if (!plan.changes.length) return 0;
  if (!apply) {
    io.log("\nDry run. Run again with --apply to write these changes.");
    return 0;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await writeAtomic(file, `${JSON.stringify(plan.settings, null, 2)}\n`);
  io.log(
    `\nWrote ${file}. Restart Claude Code for the env and model settings to take effect.`,
  );
  return 0;
};
