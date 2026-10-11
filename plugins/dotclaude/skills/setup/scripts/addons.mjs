#!/usr/bin/env -S bun --no-env-file
// Check the tools of the installed dotclaude add-ons.
//
//   bun --no-env-file addons.mjs [--apply]
//
// It prints the state of each add-on, the global installs to offer, and the project steps.
// It runs the project steps only with `--apply`, and it never runs a global install.

import os from "node:os";
import path from "node:path";
import {
  installedAddons,
  planAddons,
  reportAddons,
  runAddonSteps,
} from "../../../features/setup/addons.ts";

const configDir =
  process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
const projectDir = path.resolve(
  process.env.CLAUDE_PROJECT_DIR || process.cwd(),
);

/** The parsed JSON of `p`, or `{}` when it is missing or not valid. */
const readOptional = async (p) => {
  try {
    return JSON.parse(await Bun.file(p).text());
  } catch {
    return {};
  }
};

const names = installedAddons(
  await readOptional(path.join(configDir, "plugins", "installed_plugins.json")),
  (await readOptional(path.join(configDir, "settings.json"))).enabledPlugins,
);
if (!names.length) {
  console.log("No dotclaude add-on is installed.");
  process.exit(0);
}
const plan = planAddons(names, projectDir, process.env, Bun.version);
reportAddons(plan);
if (process.argv.includes("--apply") && !runAddonSteps(plan.steps, projectDir))
  process.exitCode = 1;
