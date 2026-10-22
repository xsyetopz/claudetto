// Runs `claudetto-setup` on a new folder that is the config folder and the project.

import { expect } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../plugins/claudetto/slices/setup/adapters/cli.ts";

/**
 * Runs `claudetto-setup --scope <scope> --apply` in a new folder that holds `files` (text by path from the folder),
 * and gives the settings file after the run and the printed text.
 */
export const runSetup = async (
  files: Record<string, string>,
  scope = "user",
) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "setup-"));
  for (const [file, text] of Object.entries(files))
    await Bun.write(path.join(dir, file), text);
  const lines: string[] = [];
  const io = {
    log: (l: string) => lines.push(l),
    error: (l: string) => lines.push(l),
  };
  const env = { CLAUDE_CONFIG_DIR: dir, CLAUDE_PROJECT_DIR: dir, HOME: dir };
  expect(await main(["--scope", scope, "--apply"], env, dir, io)).toBe(0);
  const file = scope === "user" ? "settings.json" : ".claude/settings.json";
  return {
    settings: await Bun.file(path.join(dir, file)).json(),
    text: lines.join("\n"),
  };
};
