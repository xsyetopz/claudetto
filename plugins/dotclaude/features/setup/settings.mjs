// The settings step of setup.
// The snippet is in `lib/snippet.mjs`, and the merge is in `lib/merge.mjs`.
// The functions only read, except `writeSettings`, which the script calls only with `--apply`.

import fs from "node:fs";
import path from "node:path";
import {
  foreignStatusLines,
  isObject,
  mergeSettings,
  snippetFor,
} from "../../lib/merge.mjs";
import { DOCS_SNIPPET, MYTHOS } from "../../lib/snippet.mjs";

/**
 * The settings file of `scope`.
 * `configDir` is `CLAUDE_CONFIG_DIR` or `~/.claude`, and `projectDir` is the project folder.
 * Returns null for an unknown scope.
 */
export function settingsFile(scope, configDir, projectDir) {
  const files = {
    user: path.join(configDir, "settings.json"),
    project: path.join(projectDir, ".claude", "settings.json"),
    local: path.join(projectDir, ".claude", "settings.local.json"),
  };
  return Object.hasOwn(files, scope) ? files[scope] : null;
}

/** True when the user settings or the installed plugins name `dotclaude-docs`. */
export function hasDocsAddon(userSettings, installed) {
  const id = "dotclaude-docs@dotclaude";
  return (
    userSettings?.enabledPlugins?.[id] === true ||
    Object.hasOwn(installed?.plugins ?? {}, id)
  );
}

/**
 * True when the model catalog that the API served to the account offers `MYTHOS`.
 * Claude Code 2.1.296 caches the catalog in `<config dir>/cache/model-catalog/<organizationUuid>-<hash>-<surface>.json`.
 * Its `isMythosAvailable` takes a Mythos row of `catalog.config.models` that is not `disabled` and not in the `deprecated` section.
 * This read copies that test on the newest catalog file of the organization, because an older file can be stale.
 * The file is not documented, so a missing file or another shape gives false.
 */
export function mythosInCatalog(catalogDir, organizationUuid) {
  if (!organizationUuid) return false;
  let files;
  try {
    files = fs
      .readdirSync(catalogDir)
      .filter(
        (f) => f.startsWith(`${organizationUuid}-`) && f.endsWith(".json"),
      );
  } catch {
    return false;
  }
  const newest = files
    .map((f) => path.join(catalogDir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .slice(0, 1);
  return newest.some((file) => {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      const models = data?.catalog?.config?.models;
      return (
        Array.isArray(models) &&
        models.some(
          (m) =>
            m?.id === MYTHOS &&
            m.disabled !== true &&
            m.section !== "deprecated",
        )
      );
    } catch {
      return false;
    }
  });
}

/**
 * The merged settings of `file` and the change lines.
 * `withDocs` adds `DOCS_SNIPPET`.
 * `mythos` puts `MYTHOS` in place of `FABLE`, and the script sets it from `mythosInCatalog`.
 * `skipStatusLines` leaves out the status line keys, because their command holds an absolute path of this computer.
 * Throws when `file` holds JSON that is not an object.
 */
export function planSettings(
  file,
  root,
  withDocs,
  mythos = false,
  skipStatusLines = false,
) {
  const current = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : {};
  if (!isObject(current)) throw new Error(`${file} does not hold an object.`);
  const changes = [];
  let settings = mergeSettings(
    current,
    snippetFor(current, root, mythos, skipStatusLines),
    "",
    changes,
  ).settings;
  if (withDocs)
    settings = mergeSettings(settings, DOCS_SNIPPET, "", changes).settings;
  return {
    settings,
    changes: changes.map((c) => c.line),
    kept: skipStatusLines ? [] : foreignStatusLines(current),
  };
}

/** Write `settings` to `file`, and make its folder when it is missing. */
export function writeSettings(file, settings) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`);
}
