#!/usr/bin/env node
// Check the tools of the installed dotclaude add-ons.
//
//   node addons.mjs [--apply]
//
// It prints the state of each add-on, the global installs to offer, and the project steps.
// It runs the project steps only with `--apply`, and it never runs a global install.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  installedAddons,
  planAddons,
  reportAddons,
  runAddonSteps,
} from "../../../features/setup/addons.mjs";

const configDir =
  process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
const projectDir = path.resolve(
  process.env.CLAUDE_PROJECT_DIR || process.cwd(),
);

/** The parsed JSON of `p`, or `{}` when it is missing or not valid. */
const readOptional = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {};
  }
};

const names = installedAddons(
  readOptional(path.join(configDir, "plugins", "installed_plugins.json")),
  readOptional(path.join(configDir, "settings.json")).enabledPlugins,
);
if (!names.length) {
  console.log("No dotclaude add-on is installed.");
  process.exit(0);
}
const plan = planAddons(names, projectDir, process.env, process.versions.node);
reportAddons(plan);
if (process.argv.includes("--apply") && !runAddonSteps(plan.steps, projectDir))
  process.exitCode = 1;
