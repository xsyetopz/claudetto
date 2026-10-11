#!/usr/bin/env node
// Merge the settings snippet into a Claude Code settings file.
//
//   node settings.mjs [--scope user|project|local] [--apply]
//
// Without `--apply`, it prints the changes and writes nothing.
// When the cached model catalog of the account offers `claude-mythos-5-1`, it goes in place of `claude-fable-5-1` in `availableModels`.
// A list that already holds `claude-mythos-5-1` also keeps it.
// The merge rules are in `mergeSettings` of `features/setup/settings.mjs`.
// The status line commands get the absolute path of this plugin folder, because a status line command gets no `${CLAUDE_PLUGIN_ROOT}`.
// The path holds the plugin version, so run setup again after each plugin update.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  hasDocsAddon,
  mythosInCatalog,
  planSettings,
  settingsFile,
  writeSettings,
} from "../../../features/setup/settings.mjs";
import { MYTHOS } from "../../../lib/snippet.mjs";

const args = process.argv.slice(2);
const i = args.indexOf("--scope");
const scope = i >= 0 && args[i + 1] ? args[i + 1] : "user";
const apply = args.includes("--apply");
const root = path.resolve(import.meta.dirname, "..", "..", "..");
const configDir =
  process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
const projectDir = path.resolve(
  process.env.CLAUDE_PROJECT_DIR || process.cwd(),
);
const file = settingsFile(scope, configDir, projectDir);
if (!file) {
  console.error(`Unknown scope "${scope}". Use user, project, or local.`);
  process.exit(2);
}

/** The parsed JSON of `p`, or `{}` when it is missing or not valid. */
const readOptional = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {};
  }
};
const withDocs = hasDocsAddon(
  readOptional(path.join(configDir, "settings.json")),
  readOptional(path.join(configDir, "plugins", "installed_plugins.json")),
);
// Claude Code keeps `.claude.json` in `CLAUDE_CONFIG_DIR` when it is set, and in the home folder otherwise.
const globalConfig = readOptional(
  process.env.CLAUDE_CONFIG_DIR
    ? path.join(configDir, ".claude.json")
    : path.join(os.homedir(), ".claude.json"),
);
const mythos = mythosInCatalog(
  path.join(configDir, "cache", "model-catalog"),
  globalConfig.oauthAccount?.organizationUuid,
);

let plan;
try {
  plan = planSettings(file, root, withDocs, mythos, scope === "project");
} catch (err) {
  console.error(`${err.message} Nothing changed.`);
  process.exit(1);
}

console.log(`Target: ${file} (${scope} scope)`);
console.log(`Plugin folder: ${root}`);
if (withDocs) console.log("Adds the lines for the `dotclaude-docs` add-on.");
if (mythos) console.log(`The model catalog of the account offers ${MYTHOS}.`);
if (scope === "project")
  console.log(
    "Project settings get no status line, because its command holds an absolute path of this computer. Run setup with the user or local scope for it.",
  );
for (const key of plan.kept)
  console.log(`Kept your ${key}, because it runs another tool.`);
console.log(
  plan.changes.length
    ? `${plan.changes.length} change(s):`
    : "Settings match the snippet.",
);
for (const line of plan.changes) console.log(`  ${line}`);
if (!plan.changes.length) process.exit(0);
if (!apply) {
  console.log("\nDry run. Run again with --apply to write these changes.");
  process.exit(0);
}
writeSettings(file, plan.settings);
console.log(
  `\nWrote ${file}. Restart Claude Code for the env and model settings to take effect.`,
);
