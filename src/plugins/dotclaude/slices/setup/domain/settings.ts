// The settings step of setup, as pure functions: which file a scope names, and the merge plan for a settings object.
// The CLI reads and writes the files.

import { DOCS_SNIPPET } from "../texts.ts";
import { planAutoMode } from "./automode.ts";
import {
  foreignStatusLines,
  isObject,
  MYTHOS,
  mergeSettings,
  snippetFor,
} from "./merge.ts";
import type { Change, InstalledPlugins, Json, UserSettings } from "./types.ts";

/** The scopes that the CLI takes. */
export const SCOPES = ["user", "project", "local"] as const;

/** True when the user settings or the installed plugins name `dotclaude-docs`. */
export const hasDocsAddon = (
  userSettings: UserSettings,
  installed: InstalledPlugins,
): boolean => {
  const id = "dotclaude-docs@dotclaude";
  return (
    userSettings?.enabledPlugins?.[id] === true ||
    Object.hasOwn(installed?.plugins ?? {}, id)
  );
};

/**
 * True when the parsed model catalog that the API served to the account offers `MYTHOS`.
 * Claude Code 2.1.296 caches the catalog in `<config dir>/cache/model-catalog/<organizationUuid>-<hash>-<surface>.json`.
 * Its `isMythosAvailable` takes a Mythos row of `catalog.config.models` that is not `disabled` and not in the `deprecated` section.
 * The file is not documented, so another shape gives false.
 */
export const mythosOffered = (data: unknown): boolean => {
  const models = isObject(data)
    ? (data["catalog"] as Json | undefined)?.["config"]
    : undefined;
  const list = isObject(models) ? models["models"] : undefined;
  return (
    Array.isArray(list) &&
    list.some(
      (m) =>
        isObject(m) &&
        m["id"] === MYTHOS &&
        m["disabled"] !== true &&
        m["section"] !== "deprecated",
    )
  );
};

/** The options of `planSettings`. */
export type SettingsOptions = {
  /** Adds `DOCS_SNIPPET`. */
  withDocs: boolean;
  /** Puts `MYTHOS` in place of `FABLE`. The CLI sets it from `mythosOffered`. */
  mythos?: boolean;
  /** Leaves out the status line keys, because their command holds an absolute path of this computer. */
  skipStatusLines?: boolean;
  /** Merges the `autoMode` lists of `planAutoMode`. Only the user settings take them. */
  autoMode?: boolean;
};

/**
 * The merged settings of `current` and the change lines.
 * `root` is the folder of the plugin, and `kept` names the status line keys of another tool that stay.
 * Throws when `current` is not an object.
 */
export const planSettings = (
  current: unknown,
  root: string,
  {
    withDocs,
    mythos = false,
    skipStatusLines = false,
    autoMode = false,
  }: SettingsOptions,
): { settings: Json; changes: string[]; kept: string[] } => {
  if (!isObject(current)) throw new Error("The settings are not an object.");
  const changes: Change[] = [];
  let settings = mergeSettings(
    current,
    snippetFor(current, root, mythos, skipStatusLines),
    "",
    changes,
  ).settings;
  if (withDocs)
    settings = mergeSettings(
      settings,
      DOCS_SNIPPET as Json,
      "",
      changes,
    ).settings;
  if (autoMode) settings = planAutoMode(settings, changes);
  return {
    settings,
    changes: changes.map((c) => c.line),
    kept: skipStatusLines ? [] : foreignStatusLines(current),
  };
};
