// The add-on step of setup: the tools that each installed dotclaude add-on needs.
// `planAddons` only reads.
// `runAddonSteps` writes in the project, and the script calls it only with `--apply`, after the user agrees.
// A global install changes the computer of the user, so this file only prints those commands, and the skill asks first.
// This file names each add-on as text and imports nothing from it.

import fs from "node:fs";
import path from "node:path";
import { runProgram } from "../../lib/run-program.mjs";

/** The lowest Node.js version that the bins of the add-ons need. */
const NODE_MIN = "22.18.0";

/** True when version text `a` is lower than `b`. */
const olderThan = (a, b) =>
  String(a).localeCompare(b, "en", { numeric: true }) < 0;

/**
 * The first line of the `--version` output of `program`, without the program name that some tools print first,
 * or null when it does not run.
 */
const versionOf = (program) => {
  const r = runProgram(program, ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (r.status !== 0) return null;
  const line = r.stdout.trim().split("\n")[0] ?? "";
  return line.startsWith(`${program} `) ? line.slice(program.length + 1) : line;
};

/**
 * The names of the dotclaude add-ons that are installed and not turned off in `enabled`.
 * `installed` is the parsed `installed_plugins.json`, and `enabled` is `enabledPlugins` of the user settings.
 */
export function installedAddons(installed, enabled) {
  return Object.keys(installed?.plugins ?? {})
    .filter((id) => id.endsWith("@dotclaude") && enabled?.[id] !== false)
    .map((id) => id.slice(0, -"@dotclaude".length))
    .filter((name) => name !== "dotclaude");
}

/**
 * The state lines, the global installs to offer, and the project steps for `names` in `projectDir`.
 * `env` is the environment of the session, and `node` is the Node.js version.
 */
export function planAddons(names, projectDir, env, node, version = versionOf) {
  const lines = [];
  const installs = [];
  const steps = [];
  const has = (name) => names.includes(name);
  if (has("dotclaude-codegraph")) {
    const cli = version("codegraph");
    const index = fs.existsSync(
      path.join(projectDir, ".codegraph", "codegraph.db"),
    );
    lines.push(
      `dotclaude-codegraph: codegraph ${cli ?? "not found"}, index ${index ? "built" : "missing"} (${projectDir})`,
    );
    if (!cli) installs.push("npm install -g @colbymchenry/codegraph");
    if (!index)
      steps.push({
        label: "build the code graph index",
        cmd: ["codegraph", "init", "-y"],
      });
  }
  if (has("dotclaude-browser")) {
    const cli = version("agent-browser");
    lines.push(`dotclaude-browser: agent-browser ${cli ?? "not found"}`);
    if (!cli) installs.push("npm install -g agent-browser");
  }
  if (has("dotclaude-docs"))
    lines.push(`dotclaude-docs: npx ${version("npx") ?? "not found"}`);
  if (has("dotclaude-jev"))
    lines.push(
      `dotclaude-jev: TYPESAFE_API_KEY ${env.TYPESAFE_API_KEY ? "is set" : "is not set, so the tool is not registered"}`,
    );
  for (const name of ["dotclaude-sessions", "dotclaude-lab"])
    if (has(name))
      lines.push(
        `${name}: node ${node}${olderThan(node, NODE_MIN) ? `, older than ${NODE_MIN}` : ""}`,
      );
  return { lines, installs, steps };
}

/** Print the plan of `planAddons`. */
export function reportAddons({ lines, installs, steps }) {
  if (!lines.length) return;
  console.log("\nAdd-ons:");
  for (const line of lines) console.log(`  ${line}`);
  if (installs.length) {
    console.log(
      "\nAdd-on installs. Each one changes the computer, so ask first:",
    );
    for (const cmd of installs) console.log(`  ${cmd}`);
  }
  if (steps.length) {
    console.log("\nAdd-on steps. To run them, add --apply:");
    for (const s of steps) console.log(`  ${s.label}: ${s.cmd.join(" ")}`);
  }
}

/** Run `steps` in `projectDir` in order, and stop at the first failure. Return true when all pass. */
export function runAddonSteps(steps, projectDir) {
  for (const s of steps) {
    console.log(`Add-on: ${s.cmd.join(" ")}`);
    const r = runProgram(s.cmd[0], s.cmd.slice(1), {
      cwd: projectDir,
      stdio: "inherit",
    });
    if (r.status !== 0) {
      console.error(`Add-on step failed: ${s.label}. Later steps did not run.`);
      return false;
    }
  }
  return true;
}
