// The arms of a run (spec `eval-suite`: two arms, same conditions, variant
// arms). An arm plan holds the setup commands that run in the container
// before `claude`, the `claude` arguments, and the environment.
//
// Paths are the paths inside the container (see `container.mjs`).

import {
  GATED,
  withGated,
} from "../../plugins/dotclaude/features/setup/gated.mjs";

export const ARMS = ["dotclaude", "vanilla"];
/** Variant arm pair: the default prompt, and a prompt variant (task 7.7). */
export const VARIANT_ARMS = ["default-prompt", "variant-prompt"];
/** Delegation pair: the `dotclaude` arm, and the `dotclaude` arm with the `Agent` tool denied. */
export const DELEGATION_ARMS = ["dotclaude", "no-delegation"];

/** Stop-check pair: the `dotclaude` arm, and the `dotclaude` arm with no `prompt` hook on `Stop` (task 18.15). */
export const STOP_CHECK_ARMS = ["dotclaude", "no-stop-check"];

/** Add-on pair: the `dotclaude` arm with the case add-ons, and the `dotclaude` arm without them (task 17.7). */
export const ADDON_ARMS = ["dotclaude", "no-addons"];

/** The `vanilla` arm with the built-in `Concise` output style (task 23.3). */
export const CONCISE_ARM = "vanilla-concise";

/** The prefix of a style arm: the `dotclaude` arm with `output-styles/dotclaude.md` replaced by `evals/styles/<name>.md` (task 23.3). */
export const STYLE_PREFIX = "style-";
const isStyleArm = (arm) => arm.startsWith(STYLE_PREFIX);

/** The add-on that needs an index in the work folder before `claude` runs. */
const CODEGRAPH_ADDON = "dotclaude-codegraph";

/** One arm for each eval-gated item of setup: the `dotclaude` arm with the item added (task 6.4). */
export const GATED_ARMS = Object.keys(GATED).map((name) => `gated-${name}`);

/** The arms that install the `dotclaude` plugin. */
const hasPlugin = (arm) =>
  arm === "dotclaude" ||
  arm === "no-delegation" ||
  arm === "no-stop-check" ||
  arm === "no-addons" ||
  GATED_ARMS.includes(arm) ||
  isStyleArm(arm);

export const PATHS = {
  work: "/work",
  config: "/config",
  plugins: "/plugins-src",
  pluginsNoStop: "/tmp/plugins-no-stop",
  pluginsStyle: "/tmp/plugins-style",
  style: "/harness/style.md",
  hook: "/harness/hook.mjs",
  rules: "/harness/rules.json",
  settings: "/harness/settings.json",
  variant: "/harness/variant.md",
};

/** The setup commands that copy the plugins and put the style of the arm in place of the output style of `dotclaude`. */
function styleCopy() {
  return [
    `cp -R ${PATHS.plugins} ${PATHS.pluginsStyle}`,
    `chmod -R u+w ${PATHS.pluginsStyle}`,
    `cp ${PATHS.style} ${PATHS.pluginsStyle}/plugins/dotclaude/output-styles/dotclaude.md`,
  ];
}

/**
 * The setup commands that copy the plugins and remove the `prompt` hook of `Stop` from the copy.
 * The `command` hooks of `Stop` (`autofix`, `sembr`) stay.
 */
function stopCheckCopy() {
  const file = `${PATHS.pluginsNoStop}/plugins/dotclaude/hooks/hooks.json`;
  const js = [
    `const fs = require("node:fs");`,
    `const h = JSON.parse(fs.readFileSync("${file}", "utf8"));`,
    `for (const g of h.hooks.Stop) g.hooks = g.hooks.filter((x) => x.type !== "prompt");`,
    `fs.writeFileSync("${file}", JSON.stringify(h, null, 2));`,
  ].join(" ");
  return [
    `cp -R ${PATHS.plugins} ${PATHS.pluginsNoStop}`,
    `chmod -R u+w ${PATHS.pluginsNoStop}`,
    `node -e '${js}'`,
  ];
}

/**
 * The plan of one run.
 * `opts.model` is required. `opts.maxTurns` bounds the run.
 * `opts.addons` names the add-on plugins that a case needs on the `dotclaude` arm.
 */
export function armPlan(arm, opts) {
  if (
    ![
      ...ARMS,
      ...VARIANT_ARMS,
      ...DELEGATION_ARMS,
      ...STOP_CHECK_ARMS,
      ...ADDON_ARMS,
      ...GATED_ARMS,
      CONCISE_ARM,
    ].includes(arm) &&
    !isStyleArm(arm)
  ) {
    throw new Error(`Unknown arm: ${arm}`);
  }
  if (!opts?.model) throw new Error("An arm needs a model.");
  const args = [
    "-p",
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--verbose",
    "--model",
    opts.model,
    "--permission-mode",
    "bypassPermissions",
    "--settings",
    PATHS.settings,
  ];
  if (opts.maxTurns) args.push("--max-turns", String(opts.maxTurns));
  if (arm === "variant-prompt") {
    args.push("--system-prompt-file", PATHS.variant);
  }
  const setup = [];
  if (hasPlugin(arm)) {
    // A plugin hook has no settings key that drops it, so the `no-stop-check` arm installs a copy of the plugins with the `prompt` hook of `Stop` removed.
    const source =
      arm === "no-stop-check"
        ? PATHS.pluginsNoStop
        : isStyleArm(arm)
          ? PATHS.pluginsStyle
          : PATHS.plugins;
    if (arm === "no-stop-check") setup.push(...stopCheckCopy());
    if (isStyleArm(arm)) setup.push(...styleCopy());
    // The `no-addons` arm is the `dotclaude` arm without the case add-ons.
    const addons = arm === "no-addons" ? [] : (opts.addons ?? []);
    setup.push(
      `claude plugin marketplace add ${source}`,
      "claude plugin install dotclaude@dotclaude",
      ...addons.map((a) => `claude plugin install ${a}@dotclaude`),
    );
    // The code-graph hooks run only in a project with `.codegraph/`, and the add-on never runs `init`.
    // The setup runs in the work folder, before `claude`, and the oracle is not there yet.
    if (addons.includes(CODEGRAPH_ADDON)) setup.push("codegraph init -y");
  }
  return {
    arm,
    setup,
    args,
    env: {
      CLAUDE_CONFIG_DIR: PATHS.config,
      CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1",
      DISABLE_AUTOUPDATER: "1",
    },
  };
}

/**
 * The settings file of an arm: the case hook, plus the profile for `dotclaude`.
 * A gated arm adds its item with `withGated`.
 * The `no-delegation` arm adds the `permissions.deny` entry `Agent` to the profile.
 * The `vanilla-concise` arm sets only the `outputStyle` key, which selects the built-in style.
 */
export function armSettings(arm, hook, profile = {}) {
  if (arm === CONCISE_ARM) return { ...hook, outputStyle: "Concise" };
  if (!hasPlugin(arm)) return { ...hook };
  if (GATED_ARMS.includes(arm)) {
    return { ...withGated(profile, [arm.slice("gated-".length)]), ...hook };
  }
  const settings = { ...profile, ...hook };
  if (arm === "no-delegation") {
    settings.permissions = {
      ...profile.permissions,
      deny: [...(profile.permissions?.deny ?? []), "Agent"],
    };
  }
  return settings;
}

/** The check of the init event: plugin load and version. Returns the faults. */
export function initFaults(arm, init, expectedVersion) {
  if (!init) return ["No init event."];
  const faults = [];
  const names = (init.plugins ?? []).map((p) => p.name ?? String(p));
  const loaded = names.some(
    (n) => n === "dotclaude" || n.startsWith("dotclaude@"),
  );
  if (hasPlugin(arm) && !loaded) faults.push("The plugin did not load.");
  if (arm === CONCISE_ARM && init.output_style !== "Concise")
    faults.push(
      `The output style is \`${init.output_style}\`, but \`Concise\` is expected.`,
    );
  if (!hasPlugin(arm) && names.some((n) => n.startsWith("dotclaude"))) {
    faults.push(`A dotclaude plugin loaded in the ${arm} arm.`);
  }
  if (expectedVersion && init.claude_code_version !== expectedVersion) {
    faults.push(
      `Claude Code ${init.claude_code_version} runs, but ${expectedVersion} is expected.`,
    );
  }
  return faults;
}

/** Fails when two arms report different Claude Code versions. */
export function versionMismatch(versions) {
  const set = new Set(versions.filter(Boolean));
  return set.size > 1
    ? `The arms report different Claude Code versions: ${[...set].join(", ")}.`
    : null;
}
