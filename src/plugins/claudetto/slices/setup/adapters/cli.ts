// The CLI `claudetto-setup` of the `setup` slice. The launcher `bin/claudetto-setup` calls `main`.
//
//   claudetto-setup settings [--scope user|project|local] [--advisor] [--apply]
//   claudetto-setup claude-md [--scope user|project|local] [--apply]
//   claudetto-setup addons [--apply]
//   claudetto-setup drift [--scope user|project|local]
//   claudetto-setup sandbox [--remove] [--apply]
//
// `settings`, `claude-md`, `addons`, and `sandbox` write nothing without `--apply`, and `drift` writes nothing at all.
// `settings --apply`, `addons --apply`, and `sandbox --apply` add the runtime paths of `.claude/` and `.claudetto/` to `.git/info/exclude` in a git repository, after the command succeeded.

import { EXCLUDE_HEADER } from "../domain/exclude.ts";
import { EXCLUDE_ADDED, SCOPE_MISSING, USAGE } from "../prompts.ts";
import { addonsCommand } from "./addons-cmd.ts";
import { claudeMdCommand } from "./claude-md-cmd.ts";
import { driftCommand } from "./drift-cmd.ts";
import { excludeRuntimePaths } from "./exclude-step.ts";
import { placesOf } from "./files.ts";
import { consoleIo, type Io } from "./io.ts";
import { sandboxCommand } from "./sandbox-cmd.ts";
import { settingsCommand } from "./settings-cmd.ts";

/** The value after `--scope`, `user` when the option is absent, or `undefined` when the option has no value. */
const scopeOf = (args: string[]): string | undefined => {
  const i = args.indexOf("--scope");
  if (i < 0) return "user";
  const value = args[i + 1];
  return value && !value.startsWith("--") ? value : undefined;
};

/** The options that each command takes. `--scope` takes a value. */
const OPTIONS: Record<string, readonly string[]> = {
  settings: ["--scope", "--advisor", "--apply"],
  "claude-md": ["--scope", "--apply"],
  addons: ["--apply"],
  drift: ["--scope"],
  sandbox: ["--remove", "--apply"],
};

/** The first argument of `args` that `command` does not take, or `undefined`. */
const unknownArg = (command: string, args: string[]): string | undefined => {
  const known = OPTIONS[command] ?? [];
  return args.find(
    (arg, i) => args[i - 1] !== "--scope" && !known.includes(arg),
  );
};

/** Run the CLI with `args` and return the exit status. */
export const main = async (
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
  io: Io = consoleIo,
): Promise<number> => {
  const [command = "", ...rest] = args;
  const bad = unknownArg(command, rest);
  if (bad !== undefined) {
    io.error(`Unknown argument "${bad}". ${USAGE}`);
    return 2;
  }
  const scope = scopeOf(rest);
  if (scope === undefined) {
    io.error(SCOPE_MISSING);
    return 2;
  }
  const places = placesOf(env, cwd);
  const apply = rest.includes("--apply");
  const writes = ["settings", "addons", "sandbox"].includes(command);
  let status: number;
  if (command === "settings")
    status = await settingsCommand(
      { scope, apply, advisor: rest.includes("--advisor") },
      places,
      env,
      io,
    );
  else if (command === "claude-md")
    status = await claudeMdCommand({ scope, apply }, places, io);
  else if (command === "addons")
    status = await addonsCommand({ apply }, places, io);
  else if (command === "drift") return driftCommand({ scope }, places, io);
  else if (command === "sandbox")
    status = await sandboxCommand(
      { apply, remove: rest.includes("--remove") },
      places,
      env,
      io,
    );
  else {
    io.error(USAGE);
    return 2;
  }
  // The exclude file changes only after the command accepted the call, so a bad scope or a bad settings file leaves it as it is.
  if (writes && apply && status === 0) {
    const added = await excludeRuntimePaths(places.projectDir, env);
    const paths = added.filter((line) => line !== EXCLUDE_HEADER);
    if (paths.length > 0)
      io.log(EXCLUDE_ADDED({ count: String(paths.length) }));
  }
  return status;
};
