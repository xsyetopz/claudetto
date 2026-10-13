// The CLI `dotclaude-setup` of the `setup` slice. The launcher `bin/dotclaude-setup` calls `main`.
//
//   dotclaude-setup settings [--scope user|project|local] [--advisor] [--apply]
//   dotclaude-setup addons [--apply]
//   dotclaude-setup drift [--scope user|project|local]
//
// `settings` and `addons` write nothing without `--apply`, and `drift` writes nothing at all.
// `settings --apply` and `addons --apply` add the runtime paths of `.claude/` and `.dotclaude/` to `.git/info/exclude` in a git repository.

import { EXCLUDE_HEADER } from "../domain/exclude.ts";
import { addonsCommand } from "./addons-cmd.ts";
import { driftCommand } from "./drift-cmd.ts";
import { excludeRuntimePaths } from "./exclude-step.ts";
import { placesOf } from "./files.ts";
import { consoleIo, type Io } from "./io.ts";
import { settingsCommand } from "./settings-cmd.ts";

const USAGE =
  "Usage: dotclaude-setup settings [--scope user|project|local] [--advisor] [--apply] | addons [--apply] | drift [--scope user|project|local]";

/** The value after `--scope`, or `user`. */
const scopeOf = (args: string[]): string => {
  const i = args.indexOf("--scope");
  return (i >= 0 && args[i + 1]) || "user";
};

/** Run the CLI with `args` and return the exit status. */
export const main = async (
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
  io: Io = consoleIo,
): Promise<number> => {
  const [command = "", ...rest] = args;
  const places = placesOf(env, cwd);
  const apply = rest.includes("--apply");
  const writes = command === "settings" || command === "addons";
  if (writes && apply) {
    const added = await excludeRuntimePaths(places.projectDir, env);
    const paths = added.filter((line) => line !== EXCLUDE_HEADER);
    if (paths.length > 0)
      io.log(`Added runtime paths to .git/info/exclude: ${paths.length}.`);
  }
  if (command === "settings")
    return settingsCommand(
      { scope: scopeOf(rest), apply, advisor: rest.includes("--advisor") },
      places,
      env,
      io,
    );
  if (command === "addons") return addonsCommand({ apply }, places, io);
  if (command === "drift")
    return driftCommand({ scope: scopeOf(rest) }, places, io);
  io.error(USAGE);
  return 2;
};
