// The CLI `dotclaude-handoff` of the `handoff` slice. The launcher `bin/dotclaude-handoff` calls `main`.
//
//   dotclaude-handoff path     the path of a new handoff file: the folder `HANDOFF_DIR` and a name from the time
//   dotclaude-handoff newest   the path of the newest handoff file, or exit status 1 when there is none
//
// Every path is relative to the folder where the command runs, which is the root of the repository.
// The CLI writes no file.
// It does not read `state.json` or the spec store.

import path from "node:path";
import { fileReader } from "../../../../../kernel/node/fs.ts";
import { HANDOFF_DIR } from "../../../../../kernel/paths.ts";
import type { Clock, FileReader } from "../../../../../kernel/ports.ts";
import { handoffName, newestName } from "../domain/files.ts";

const USAGE = "Usage: dotclaude-handoff path | newest";

/** The ports of the CLI. A test gives fakes. */
export interface Deps {
  readonly files: FileReader;
  readonly clock: Clock;
  readonly log: (line: string) => void;
  readonly error: (line: string) => void;
}

const defaults = (): Deps => ({
  files: fileReader,
  clock: { now: () => Date.now() },
  log: (line) => console.log(line),
  error: (line) => console.error(line),
});

/** Run the CLI with `args` and return the exit status. */
export const main = async (
  args: string[],
  cwd: string = process.cwd(),
  deps: Deps = defaults(),
): Promise<number> => {
  if (args.length === 1 && args[0] === "path") {
    deps.log(
      path.posix.join(HANDOFF_DIR, handoffName(new Date(deps.clock.now()))),
    );
    return 0;
  }
  if (args.length === 1 && args[0] === "newest") {
    const name = newestName(await deps.files.list(path.join(cwd, HANDOFF_DIR)));
    if (!name) {
      deps.error(`No handoff file in ${HANDOFF_DIR}.`);
      return 1;
    }
    deps.log(path.posix.join(HANDOFF_DIR, name));
    return 0;
  }
  deps.error(USAGE);
  return 2;
};
