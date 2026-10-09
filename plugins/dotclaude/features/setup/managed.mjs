// The old dotclaude managed settings file.
// dotclaude 0.27.0 offered `templates/managed-settings.json` for an administrator to copy.
// dotclaude 0.28.0 writes no managed file and runs no `sudo`.
// Setup only reads the file, offers to move its keys into user settings, and prints the removal command.

import fs from "node:fs";
import path from "node:path";

const DIRS = {
  darwin: "/Library/Application Support/ClaudeCode",
  linux: "/etc/claude-code",
  win32: "C:\\Program Files\\ClaudeCode",
};

/** The folder of the managed settings on `platform`, or undefined when the platform has none. */
export const managedDir = (platform = process.platform) => DIRS[platform];

/** True when `settings` is a managed file of dotclaude, by the `$schema` of the old template. */
export const isDotclaudeManaged = (settings) =>
  typeof settings?.$schema === "string" &&
  settings.$schema.includes("xsyetopz/dotclaude") &&
  settings.$schema.includes("managed-settings");

/**
 * The old dotclaude managed file in `dir`, as `{ file, keys }`, or null.
 * `keys` is the file without `$schema`.
 * A file that is not valid JSON, or that dotclaude did not write, gives null.
 */
export function findOldManaged(dir) {
  if (!dir) return null;
  const file = path.join(dir, "managed-settings.json");
  try {
    const { $schema, ...keys } = JSON.parse(fs.readFileSync(file, "utf8"));
    return isDotclaudeManaged({ $schema }) ? { file, keys } : null;
  } catch {
    return null;
  }
}

/** The command that the user runs to remove `file`. Setup prints it and never runs it. */
export const removeCommand = (file, platform = process.platform) =>
  platform === "win32" ? `del "${file}"` : `sudo rm "${file}"`;
