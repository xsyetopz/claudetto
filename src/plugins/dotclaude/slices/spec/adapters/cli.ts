// The CLI `dotclaude-spec` of the `spec` slice. The launcher `bin/dotclaude-spec` calls `main`.
//
//   dotclaude-spec specify <id> [--size trivial|medium|large] [--capability <name>] [--json]
//   dotclaude-spec plan <id> [--json]
//   dotclaude-spec implement <package> [--note <text>] [--decision fix-code|revise-spec] [--json]
//   dotclaude-spec verify <package> [--in <dir>] [--json]
//   dotclaude-spec accept <id> [--json]
//   dotclaude-spec block <package> --note <text> [--json]
//   dotclaude-spec status [<id>]
//   dotclaude-spec next [<id>]
//   dotclaude-spec show <id> [<package>] [--json]
//   dotclaude-spec list [--json]
//   dotclaude-spec review <package> approve|reject [--finding <text>]... [--json]
//   dotclaude-spec drop <package> --reason <text> [--json]
//   dotclaude-spec deps [<id>] [--json]
//   dotclaude-spec log [<id>] [--package <package>] [--json]
//   dotclaude-spec ready [<id>]
//   dotclaude-spec merge <package> <branch>
//   dotclaude-spec validate [<id>]
//   dotclaude-spec archive <id>
//   dotclaude-spec runs
//
// Every path is relative to the folder where the command runs, which is the root of the repository.
// A command that reads `events.jsonl` stops with a message on a `schema` that it does not know.

import { acceptCommand } from "./accept.ts";
import { archiveCommand } from "./archive.ts";
import { blockCommand } from "./block.ts";
import { depsCommand } from "./deps.ts";
import { dropCommand } from "./drop.ts";
import { implementCommand } from "./implement.ts";
import { type Clock, consoleIo, type Io, systemClock } from "./io.ts";
import { listCommand } from "./list.ts";
import { logCommand } from "./log.ts";
import { mergeCommand } from "./merge.ts";
import { planCommand } from "./plan.ts";
import { readyCommand } from "./ready.ts";
import { reviewCommand } from "./review.ts";
import type { Run } from "./run.ts";
import { runsCommand } from "./runs.ts";
import { showCommand } from "./show.ts";
import { specifyCommand } from "./specify.ts";
import { nextCommand, statusCommand } from "./status.ts";
import { SpecStore } from "./store.ts";
import { validateCommand } from "./validate.ts";
import { verifyCommand } from "./verify.ts";

const USAGE = [
  "Usage: dotclaude-spec <command>",
  "  specify <id> [--size trivial|medium|large] [--capability <name>] [--json]",
  "  plan <id> [--json]",
  "  implement <package> [--note <text>] [--decision fix-code|revise-spec] [--json]",
  "  verify <package> [--in <dir>] [--json]",
  "  status [<id>]",
  "  next [<id>]",
  "  show <id> [<package>] [--json]",
  "  list [--json]",
  "  review <package> approve|reject [--finding <text>]... [--decision fix-code|revise-spec] [--json]",
  "  block <package> --note <text> [--json]",
  "  drop <package|change> --reason <text> [--json]",
  "  deps [<id>] [--json]",
  "  log [<id>] [--package <package>] [--json]",
  "  ready [<id>]",
  "  merge <package> [<branch>] [--json]",
  "  accept <id> [--json]",
  "  validate [<id>]",
  "  archive <id> [--json]",
  "  runs",
].join("\n");

const COMMANDS: Readonly<
  Record<string, (run: Run, args: string[]) => number | Promise<number>>
> = {
  specify: specifyCommand,
  plan: planCommand,
  implement: implementCommand,
  verify: verifyCommand,
  accept: acceptCommand,
  block: blockCommand,
  status: statusCommand,
  next: nextCommand,
  show: showCommand,
  list: listCommand,
  review: reviewCommand,
  drop: dropCommand,
  deps: depsCommand,
  log: logCommand,
  ready: readyCommand,
  merge: mergeCommand,
  validate: validateCommand,
  archive: archiveCommand,
  runs: runsCommand,
};

/** Run the CLI with `args` and return the exit status. */
export const main = async (
  args: string[],
  cwd: string = process.cwd(),
  io: Io = consoleIo,
  clock: Clock = systemClock,
): Promise<number> => {
  const [name = "", ...rest] = args;
  const command = Object.hasOwn(COMMANDS, name) ? COMMANDS[name] : undefined;
  if (!command) {
    io.error(USAGE);
    return 2;
  }
  try {
    return await command({ store: new SpecStore(cwd), io, clock }, rest);
  } catch (err) {
    io.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
};
