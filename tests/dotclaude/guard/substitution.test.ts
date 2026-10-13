// Tests of the destructive floor against the shell forms that hide the git verb (`git $(echo reset)`, `env git`, `command git`).
// The engine stub reads a real fixture folder for the `kind` and `.git` lookups, and no command runs.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type { EngineInterface } from "claude-code";
import { onBashCall } from "../../../src/plugins/dotclaude/slices/guard/adapters/mod.ts";
import { tmpDir } from "../../support/repo.ts";

/** A checkout with a `.git` folder, which is the main checkout of a repository. */
const main = tmpDir("dc-guard-subst");
fs.mkdirSync(path.join(main, ".git"), { recursive: true });
fs.mkdirSync(path.join(main, "src"), { recursive: true });
await Bun.write(path.join(main, "src", "a.ts"), "export {};\n");

/** The engine ports that the guard reads: `fs.stat` for the kind of a path, relative to `cwd`. */
const engineIn = (cwd: string): EngineInterface =>
  ({
    session: { cwd: async () => cwd },
    fs: {
      stat: async (file: string) => {
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

/** The `tool.call` event of a `Bash` command. */
const bash = (command: string) => ({
  tool: "Bash" as const,
  tool_use_id: "u1",
  command,
});

/** A call that reaches the guard: the engine would run it, so `next` answers `ok`. */
const passes = (() => ({ result: "ok" })) as never;

/** The destructive git commands in a form that hides the verb from a plain read. */
const HIDDEN_FLOOR = [
  "git $(echo reset) --hard",
  "git `echo reset` --hard",
  "git $'reset' --hard",
  "git$" + "{IFS}reset$" + "{IFS}--hard",
  "env git reset --hard",
  "command git reset --hard",
  "xargs git reset --hard",
  "git -c user.name=x reset --hard",
  "git --no-pager reset --hard",
  "alias g=git; g reset --hard",
  "env git clean -fd",
  "command git stash drop",
];

test("a destructive git command in a hidden form is denied in the main session", async () => {
  const allowed: string[] = [];
  for (const command of HIDDEN_FLOOR) {
    const out = await onBashCall(engineIn(main), bash(command), passes);
    if (!("deny" in out)) allowed.push(command);
  }
  expect(allowed).toStrictEqual([]);
});
