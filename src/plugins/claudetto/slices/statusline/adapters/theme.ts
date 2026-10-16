// The built-in theme of Claude Code: the `theme` key of its config file.
// The file is `.claude.json` in `CLAUDE_CONFIG_DIR`, or in the home folder when that variable is not set.

import path from "node:path";
import { failureText } from "../../../../../kernel/node/hook-io.ts";
import { CLAUDE_STATE_FILE } from "../../../../../kernel/paths.ts";
import type { FileReader } from "../../../../../kernel/ports.ts";

/** The config file of Claude Code for `env` and `home`. */
export const configFile = (
  env: Readonly<Record<string, string | undefined>>,
  home: string,
): string => path.join(env["CLAUDE_CONFIG_DIR"] || home, CLAUDE_STATE_FILE);

/**
 * The name in the `theme` key, or `null` when the file is missing or the key is not a string.
 * A file that cannot be read or parsed gives `null`, and the cause goes to `onError`.
 */
export const readThemeName = async (
  file: string,
  files: FileReader,
  onError: (text: string) => void,
): Promise<string | null> => {
  try {
    const text = await files.read(file);
    if (text === null) return null;
    const theme: unknown = (JSON.parse(text) as { theme?: unknown } | null)
      ?.theme;
    return typeof theme === "string" ? theme : null;
  } catch (err) {
    onError(failureText(err));
    return null;
  }
};
