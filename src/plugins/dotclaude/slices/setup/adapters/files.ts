// The reads of the CLI: the folders of the session and the JSON files of Claude Code.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mythosOffered } from "../domain/settings.ts";
import type { Json } from "../domain/types.ts";

/** The folders that a run of the CLI works in. */
export type Places = {
  /** `CLAUDE_CONFIG_DIR`, or `~/.claude`. */
  configDir: string;
  /** `CLAUDE_PROJECT_DIR`, or the working folder. */
  projectDir: string;
  /** The folder of the plugin that holds this CLI. */
  root: string;
};

/** The folders of this run. `root` is the plugin folder, three levels above this file. */
export const placesOf = (env: NodeJS.ProcessEnv, cwd: string): Places => ({
  configDir: env["CLAUDE_CONFIG_DIR"] || path.join(os.homedir(), ".claude"),
  projectDir: path.resolve(env["CLAUDE_PROJECT_DIR"] || cwd),
  root: path.resolve(import.meta.dirname, "..", "..", ".."),
});

/** The parsed JSON of `file`, or `{}` when it is missing or not valid. */
export const readOptional = async (file: string): Promise<Json> => {
  try {
    const data: unknown = JSON.parse(await Bun.file(file).text());
    return data !== null && typeof data === "object" ? (data as Json) : {};
  } catch {
    return {};
  }
};

/**
 * True when the newest cached model catalog of the organization offers `MYTHOS`.
 * An older file can be stale, so only the newest one counts.
 * A missing folder or file gives false.
 */
export const mythosInCatalog = async (
  catalogDir: string,
  organizationUuid: unknown,
): Promise<boolean> => {
  if (typeof organizationUuid !== "string" || !organizationUuid) return false;
  let files: string[];
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
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  if (!newest) return false;
  try {
    return mythosOffered(JSON.parse(await Bun.file(newest).text()));
  } catch {
    return false;
  }
};
