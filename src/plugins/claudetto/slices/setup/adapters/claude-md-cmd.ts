// The `claude-md` command of `claudetto-setup`: merge the managed block of working rules into a `CLAUDE.md` file.
// Without `--apply`, it prints the diff and writes nothing.
// The block holds a section for each installed add-on that needs project instructions.
// A second run replaces only the block. A file with broken markers is refused and stays as it is.

import fs from "node:fs";
import path from "node:path";
import { writeAtomic } from "../../../../../kernel/node/fs.ts";
import { SETTINGS_FILE } from "../../../../../kernel/paths.ts";
import { installedAddons } from "../domain/addons.ts";
import {
  brokenMessage,
  claudeMdBlock,
  planClaudeMd,
} from "../domain/claude-md.ts";
import {
  CLAUDE_MD_MATCH,
  CLAUDE_MD_READ_FAILED,
  DRY_RUN,
  UNKNOWN_SCOPE,
  WROTE_CLAUDE_MD,
} from "../prompts.ts";
import { claudeMdFile, type Places, readOptional } from "./files.ts";
import type { Io } from "./io.ts";

/** Run the `claude-md` command and return the exit status. */
export const claudeMdCommand = async (
  { scope, apply }: { scope: string; apply: boolean },
  { configDir, projectDir }: Places,
  io: Io,
): Promise<number> => {
  const file = claudeMdFile(scope, configDir, projectDir);
  if (!file) {
    io.error(UNKNOWN_SCOPE({ scope }));
    return 2;
  }
  let current: string | undefined;
  try {
    current = fs.existsSync(file) ? await Bun.file(file).text() : undefined;
  } catch (err) {
    io.error(CLAUDE_MD_READ_FAILED({ file, message: (err as Error).message }));
    return 1;
  }
  const addons = installedAddons(
    await readOptional(
      path.join(configDir, "plugins", "installed_plugins.json"),
    ),
    (await readOptional(path.join(configDir, SETTINGS_FILE)))[
      "enabledPlugins"
    ] as Record<string, unknown> | undefined,
  );
  const plan = planClaudeMd(current, claudeMdBlock(addons));
  if (plan.status === "broken") {
    io.error(brokenMessage(plan.kind, file));
    return 1;
  }
  io.log(`Target: ${file} (${scope} scope)`);
  if (plan.status === "same") {
    io.log(CLAUDE_MD_MATCH);
    return 0;
  }
  io.log(plan.status === "created" ? "New file:" : "Changes:");
  for (const line of plan.diff) io.log(`  ${line}`);
  if (!apply) {
    io.log(`\n${DRY_RUN}`);
    return 0;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await writeAtomic(file, plan.text);
  io.log(`\n${WROTE_CLAUDE_MD({ file })}`);
  return 0;
};
