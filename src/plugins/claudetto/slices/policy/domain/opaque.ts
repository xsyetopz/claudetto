// The `Bash` commands that run a program whose acts the gate cannot read, such as a script, a build, or an interpreter.
// `mark.ts` blanks the GitHub tokens for such a command in a checkout that is closed, so that a hidden `gh` or API call gets no token.
// A known read, `git`, `gh`, a network client in the list of `net.ts`, and `cd` are not opaque: `tool.call` and the `pre-push` hook check them.
// The reading compares the words of each simple command with fixed lists. It never scans prose.

import { parse } from "../../../../../kernel/shell.ts";
import { baseName, stripWrappers } from "../../../../../kernel/wrappers.ts";
import { netOf } from "./net.ts";
import { isDynamic, under } from "./paths.ts";
import { readsOnly } from "./readonly.ts";

/** What `mark.ts` needs to know about a command. */
export type Script = {
  /** A command of the text runs a program that the gate cannot read. */
  opaque: boolean;
  /** The folders that the text changes to with `cd`, as words: relative to the session folder, absolute, or with `~`. */
  dirs: string[];
};

/** True when the simple command `words`, with the program name `head`, is one that the gate reads. */
const known = (head: string, words: string[]): boolean =>
  head === "git" ||
  head === "gh" ||
  netOf(head, words) !== undefined ||
  readsOnly(head, words);

/** The opaque state and the `cd` folders of `command`. A text that the reader cut short, or that runs code as an argument, is opaque. */
export const scriptOf = (command: string): Script => {
  const parsed = parse(command);
  let opaque = parsed.truncated || parsed.code.length > 0;
  const dirs: string[] = [];
  let dir: string | undefined;
  for (const argv of parsed.commands) {
    const words = stripWrappers(argv);
    const head = words[0] === undefined ? "" : baseName(words[0]);
    if (head === "cd") {
      const operand = words.slice(1).find((w) => !w.startsWith("-")) ?? "";
      if (operand !== "" && operand !== "-" && !isDynamic(operand)) {
        dir = under(dir, operand);
        dirs.push(dir);
      }
    } else if (head !== "" && !known(head, words)) opaque = true;
  }
  return { opaque, dirs };
};
