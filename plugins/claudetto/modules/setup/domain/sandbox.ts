// The sandbox paths that setup writes: the lists of the gate (`gate/domain/paths.ts`) in the path form of `sandbox.filesystem`.
// A `.env` file has no entry: under a `**/.env` deny, `bun` exits 1 in a folder with a `.env` file (`srt` 0.0.81, 2026-10-26), and the gate stops each command that names one.
import path from "node:path";
import { HOME_SECRETS, SYSTEM_DIRS, SYSTEM_OPEN } from "../../gate/index.ts";
import { SANDBOX_MAX_CHILDREN } from "../limits.ts";

const inside = (child: string, root: string): boolean =>
  !path.posix.relative(root, child).startsWith("..");

/**
 * The paths of `SYSTEM_DIRS` for `denyWrite`. A folder with an open folder inside it, such as `/usr` with `/usr/local`,
 * gives its other entries, from `children`, because a deny of the folder also stops the open one (`denyWrite` wins over `allowWrite`).
 */
const systemPaths = (children: (dir: string) => string[]): string[] =>
  SYSTEM_DIRS.flatMap((dir) =>
    SYSTEM_OPEN.some((open) => inside(open, dir))
      ? children(dir)
          .slice(0, SANDBOX_MAX_CHILDREN)
          .map((name) => path.posix.join(dir, name))
          .filter((child) => !SYSTEM_OPEN.some((open) => inside(child, open)))
      : [dir],
  );

/** The `sandbox` snippet: `denyRead` for the secret paths below `~`, and `denyWrite` for the system folders. `children` lists the entry names of a folder. */
export const sandboxSnippet = (children: (dir: string) => string[]) => ({
  filesystem: {
    denyRead: HOME_SECRETS.map((secret) => `~/${secret.replace(/\/$/, "")}`),
    denyWrite: systemPaths(children),
  },
});
