// Test helpers for the destructive floor of the `guard` slice: fixture checkouts, a stub engine, and the calls of `onBashCall`.
// The fixtures are real folders in the temp folder, and the stub engine reads them with `fs.stat`, as the adapter does.
// No command runs, and each stat is counted so that a test can check the lookups of a call.

import fs from "node:fs";
import path from "node:path";
import type { EngineInterface } from "claude-code";
import { onBashCall } from "../../../src/plugins/dotclaude/slices/guard/adapters/mod.ts";
import { tmpDir } from "../../support/repo.ts";

/** A checkout with a `.git` folder, a folder `src`, and a file `src/a.ts`: the main checkout of a repository. */
export const main = tmpDir("dc-guard-ports-main");
fs.mkdirSync(path.join(main, ".git"), { recursive: true });
fs.mkdirSync(path.join(main, "src"), { recursive: true });
fs.writeFileSync(path.join(main, "src", "a.ts"), "export {};\n");

/** A linked worktree, where `.git` is a file that names the folder of the main checkout. */
export const linked = tmpDir("dc-guard-ports-linked");
fs.writeFileSync(path.join(linked, ".git"), `gitdir: ${main}/.git\n`);
fs.mkdirSync(path.join(linked, "src"), { recursive: true });
fs.writeFileSync(path.join(linked, "src", "a.ts"), "export {};\n");

/** A folder that has neither a `.git` folder nor the paths of the fixtures. */
export const bare = tmpDir("dc-guard-ports-bare");

/** A stub engine for the folder `cwd`, with the `stat` calls recorded in `stats`. */
export const engineIn = (cwd: string, stats: string[] = []): EngineInterface =>
  ({
    fs: {
      stat: async (file: string) => {
        stats.push(file);
        const s = await fs.promises.stat(path.resolve(cwd, file));
        return {
          kind: s.isDirectory() ? "dir" : s.isFile() ? "file" : "other",
          size: s.size,
          mtimeMs: s.mtimeMs,
          isLink: false,
        };
      },
    },
  }) as unknown as EngineInterface;

/** The `tool.call` event of a `Bash` command, from a subagent when `agentId` is given. */
export const bash = (command: string, agentId?: string) => ({
  tool: "Bash" as const,
  tool_use_id: "u1",
  command,
  ...(agentId ? { agentId } : {}),
});

/** A call that reaches the guard: the engine would run it, so `next` answers `ok`. */
export const passes = (() => ({ result: "ok" })) as never;

/** The deny text of `command` from the main session in `cwd`, or null when it stays allowed. */
export const mainDeny = async (command: string, cwd: string): Promise<string | null> => {
  const out = await onBashCall(engineIn(cwd), bash(command), passes);
  return "deny" in out ? out.deny : null;
};

/** The deny text of `command` from a subagent in `cwd`, or null when it stays allowed. */
export const subagentDeny = async (command: string, cwd: string): Promise<string | null> => {
  const out = await onBashCall(engineIn(cwd), bash(command, "a1"), passes);
  return "deny" in out ? out.deny : null;
};
