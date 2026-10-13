// The add-on step of setup: the tools that each installed dotclaude add-on needs.
// These functions are pure.
// The CLI reads the tool versions and the index, runs the project steps only with `--apply`, and prints the lines.
// A global install changes the computer of the user, so the CLI only prints those commands, and the skill asks first.
// This file names each add-on as text and imports nothing from it.

import { BUN_MIN } from "../limits.ts";
import type { AddonPlan, InstalledPlugins, Step } from "./types.ts";

/** True when version text `a` is lower than `b`. */
const olderThan = (a: string, b: string): boolean =>
  String(a).localeCompare(b, "en", { numeric: true }) < 0;

/**
 * The names of the dotclaude add-ons that are installed and not turned off in `enabled`.
 * `installed` is the parsed `installed_plugins.json`, and `enabled` is `enabledPlugins` of the user settings.
 */
export const installedAddons = (
  installed: InstalledPlugins,
  enabled: Record<string, unknown> | null | undefined,
): string[] =>
  Object.keys(installed?.plugins ?? {})
    .filter((id) => id.endsWith("@dotclaude") && enabled?.[id] !== false)
    .map((id) => id.slice(0, -"@dotclaude".length))
    .filter((name) => name !== "dotclaude");

/** What the plan reads from the computer. */
export type AddonFacts = {
  /** The project folder, for the lines. */
  projectDir: string;
  /** The Bun version. */
  bun: string;
  /** The version text of `program`, or `null` when it does not run. */
  version: (program: string) => string | null;
  /** True when the index of `dotclaude-codegraph` exists in the project. */
  indexBuilt: boolean;
};

/** The state lines, the global installs to offer, and the project steps for the add-ons `names`. */
export const planAddons = (
  names: string[],
  { projectDir, bun, version, indexBuilt }: AddonFacts,
): AddonPlan => {
  const lines: string[] = [];
  const installs: string[] = [];
  const steps: Step[] = [];
  const has = (name: string) => names.includes(name);
  if (has("dotclaude-codegraph")) {
    const cli = version("codegraph");
    lines.push(
      `dotclaude-codegraph: codegraph ${cli ?? "not found"}, index ${indexBuilt ? "built" : "missing"} (${projectDir})`,
    );
    if (!cli) installs.push("npm install -g @colbymchenry/codegraph");
    if (!indexBuilt)
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
  for (const name of ["dotclaude-sessions", "dotclaude-lab"])
    if (has(name))
      lines.push(
        `${name}: bun ${bun}${olderThan(bun, BUN_MIN) ? `, older than ${BUN_MIN}` : ""}`,
      );
  return { lines, installs, steps };
};

/** The lines that report `plan`, or no line when the plan has no state line. */
export const addonReport = ({
  lines,
  installs,
  steps,
}: AddonPlan): string[] => {
  if (!lines.length) return [];
  const out = ["", "Add-ons:", ...lines.map((line) => `  ${line}`)];
  if (installs.length)
    out.push(
      "",
      "Add-on installs. Each one changes the computer, so ask first:",
      ...installs.map((cmd) => `  ${cmd}`),
    );
  if (steps.length)
    out.push(
      "",
      "Add-on steps. To run them, add --apply:",
      ...steps.map((s) => `  ${s.label}: ${s.cmd.join(" ")}`),
    );
  return out;
};
