// The drift check: the differences between the active settings and the settings snippet of the wiki, as lines for Claude.
// The functions are pure, so the lab test and the hooks module share them.

/** @import { ContextSkill, PromptComposeSection, Settings } from "claude-code" */

import {
  isOurStatusLine,
  mergeSettings,
  snippetFor,
} from "../../lib/merge.mjs";
import {
  ENGINE_SECTIONS,
  GUARD_SKIPS,
  OFF_PLUGINS,
  OVERRIDE_ENV,
  SYNCED_SOURCE,
  TESTED_VERSION,
} from "./data.mjs";
import { GAP_KEYS_MAX } from "./limits.mjs";

/** @param {string[]} list */
const names = (list) => list.map((n) => `\`${n}\``).join(", ");

/** The status line commands of the snippet, which hold the plugin folder. */
const STATUS_KEYS = ["statusLine.command", "subagentStatusLine.command"];

/**
 * The key paths of the snippet that `settings` does not have or holds with another value.
 * `root` is the folder of the running plugin, so a status line command of another version is a gap.
 * The built-in plugins have their own line, so their keys are not here.
 *
 * @param {Settings} settings
 * @param {string} root
 */
export function snippetGaps(settings, root) {
  /** @type {{ key: string, line: string }[]} */
  const changes = [];
  const want = snippetFor(settings, root);
  mergeSettings(settings, want, "", changes);
  // The merged view can repeat or add models, so `availableModels` is a gap only when it lacks a model of the snippet.
  /** @type {unknown[]} */
  const have = Array.isArray(settings.availableModels)
    ? settings.availableModels
    : [];
  const models = /** @type {string[]} */ (want.availableModels ?? []);
  const allModels = models.every((m) => have.includes(m));
  return changes
    .map((c) => c.key)
    .filter((key) => !key.startsWith("enabledPlugins."))
    .filter((key) => !(key === "availableModels" && allModels));
}

/**
 * The status line commands of `settings` that run the status line of a dotclaude folder other than `root`.
 *
 * @param {Settings} settings
 * @param {string} root
 */
export function staleStatusLines(settings, root) {
  const want = snippetFor(settings, root);
  /** @type {Record<string, any>} */
  const have = settings;
  return STATUS_KEYS.filter((key) => {
    const [name] = key.split(".");
    const command = have[name ?? ""]?.command;
    return (
      typeof command === "string" &&
      isOurStatusLine(command) &&
      command !== want[name ?? ""]?.command
    );
  });
}

/**
 * The built-in plugins of the snippet that the settings do not turn off.
 *
 * @param {Settings | undefined} settings
 */
export const pluginsOn = (settings) => {
  const enabled = /** @type {Record<string, unknown> | undefined} */ (
    settings?.enabledPlugins
  );
  return OFF_PLUGINS.filter((id) => enabled?.[id] !== false);
};

/**
 * The synced skills in the entries of the skill listing.
 *
 * @param {ContextSkill[]} [skills]
 */
export const syncedSkills = (skills = []) =>
  skills.filter((s) => s.source === SYNCED_SOURCE).map((s) => s.name);

/**
 * The section ids that neither Claude Code 2.1.296 nor a plugin has.
 *
 * @param {readonly PromptComposeSection[]} [sections]
 */
export const unknownSections = (sections = []) =>
  sections
    .map((s) => s.id)
    .filter((id) => !id.includes(":") && !ENGINE_SECTIONS.includes(id));

/**
 * Whether the guard is seated: managed settings exist when the policy source has a key.
 *
 * @param {Settings | undefined} policy
 */
export const isSeated = (policy) => Object.keys(policy ?? {}).length > 0;

/**
 * The lines of the drift check, in a fixed order.
 * The facts are `settings` (merged), `policy` (the managed source), `version`, `skills` (the listing entries), `sections`,
 * and `blocking` (the value of each variable that overrides the agent files).
 * A fact that the caller could not read is undefined, and it gives no line.
 * The result is empty when nothing differs.
 *
 * @param {object} facts
 * @param {Settings} [facts.settings]
 * @param {Settings} [facts.policy]
 * @param {string} [facts.version]
 * @param {ContextSkill[]} [facts.skills]
 * @param {readonly PromptComposeSection[]} [facts.sections]
 * @param {Record<string, string | undefined>} [facts.blocking]
 * @param {string} [facts.root] the folder of the running plugin
 */
export function driftLines({
  settings,
  policy,
  version,
  skills,
  sections,
  blocking = {},
  root,
}) {
  /** @type {string[]} */
  const lines = [];
  if (isSeated(policy))
    lines.push(
      `The guard of Claude Code is seated, because managed settings exist. It skips these dotclaude parts: ${GUARD_SKIPS.join(" and ")}.`,
    );
  if (version !== undefined && version !== TESTED_VERSION)
    lines.push(
      `Claude Code ${version} is not the tested version ${TESTED_VERSION}, so a mod event can differ.`,
    );
  const stale = settings && root ? staleStatusLines(settings, root) : [];
  if (stale.length)
    lines.push(
      `${names(stale)} ${stale.length > 1 ? "run" : "runs"} the status line of a dotclaude folder that is not the installed plugin folder \`${root}\`, so the status line can show nothing. The user can fix this with \`/dotclaude:setup\`.`,
    );
  const gaps =
    settings && root
      ? snippetGaps(settings, root).filter((k) => !stale.includes(k))
      : [];
  if (gaps.length) {
    const keys = [...new Set(gaps.map((k) => k.split(".")[0] ?? k))];
    const more = keys.length - GAP_KEYS_MAX;
    lines.push(
      `The settings do not have ${gaps.length} ${gaps.length > 1 ? "values" : "value"} of the snippet, in ${keys.length > 1 ? "these keys" : "this key"}: ${names(keys.slice(0, GAP_KEYS_MAX))}${more > 0 ? `, and ${more} more` : ""}. The user can apply the snippet with \`/dotclaude:setup\`.`,
    );
  }
  const on = settings ? pluginsOn(settings) : [];
  if (on.length)
    lines.push(
      `${on.length > 1 ? "These built-in plugins are" : "This built-in plugin is"} on: ${names(on)}. The user can turn ${on.length > 1 ? "them" : "it"} off with \`false\` in \`enabledPlugins\` of the user settings.`,
    );
  const synced = syncedSkills(skills);
  if (synced.length)
    lines.push(
      `The skill listing has ${synced.length} synced claude.ai ${synced.length > 1 ? "skills" : "skill"}. The user can remove ${synced.length > 1 ? "them" : "it"} with \`syncClaudeAiSkills\` set to \`false\` in the user settings.`,
    );
  const unknown = unknownSections(sections);
  if (unknown.length)
    lines.push(
      `The system prompt has ${unknown.length > 1 ? "sections" : "a section"} with ${unknown.length > 1 ? "ids" : "an id"} that dotclaude does not know: ${names(unknown)}. dotclaude does not change ${unknown.length > 1 ? "them" : "it"}.`,
    );
  const set = OVERRIDE_ENV.filter((k) => blocking[k]);
  if (set.length)
    lines.push(
      `The \`model\` and \`effort\` of the agent files do not apply, because ${names(set)} ${set.length > 1 ? "are" : "is"} set. The user can apply them by unsetting ${set.length > 1 ? "them" : "it"}.`,
    );
  return lines;
}

/**
 * The text for the session, or undefined when no line exists.
 * The settings are the decision of the user, so the note gives each fix as a fact about the user.
 * In an eval run, Claude changed `/config/settings.json` from a line of this note (2026-10-09).
 *
 * @param {string[]} lines
 */
export const driftNote = (lines) =>
  lines.length
    ? `dotclaude found differences from its settings snippet.\nThe user has not seen these differences.\nThe settings and the environment are the decision of the user, so do not change them yourself.\n${lines.map((l) => `- ${l}`).join("\n")}`
    : undefined;
