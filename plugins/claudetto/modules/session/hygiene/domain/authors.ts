// Who changed a file (spec `session-hygiene`, "Who Changed a File"): this session, another session, or the user.
// A change of the user is a file that no ledger line holds with its current hash.

import {
  type LedgerLine,
  madeBy,
  type WorkFile,
} from "../../../project/index.ts";
import { commands, stripWrappers } from "../../../shell/index.ts";
import { WHO_CHANGED } from "../prompts.ts";

/** The `git` options that take the next word as their value. */
const VALUE_OPTIONS = new Set(["-C", "-c"]);

/** Whether `command` runs `git status` or `git diff`, also after wrappers and `git` options such as `-C dir`. */
export const isGitView = (command: unknown): boolean =>
  commands(command).some((argv) => {
    const [head, ...rest] = stripWrappers(argv);
    if (head?.replace(/^.*\//, "") !== "git") return false;
    for (let i = 0; i < rest.length; i++) {
      const word = rest[i] as string;
      if (VALUE_OPTIONS.has(word)) i++;
      else if (!word.startsWith("-"))
        return word === "status" || word === "diff";
    }
    return false;
  });

/** The context that sorts `files` by maker, or `null` when there is no changed file. */
export const whoChanged = (
  lines: readonly LedgerLine[],
  session: string,
  files: readonly WorkFile[],
): string | null => {
  if (files.length === 0) return null;
  const own: string[] = [];
  const others: string[] = [];
  const user: string[] = [];
  for (const { path, hash } of files) {
    const made = madeBy(lines, path, hash);
    const other = made.find((l) => l.session !== session);
    if (made.some((l) => l.session === session)) own.push(`\`${path}\``);
    else if (other)
      others.push(
        `\`${path}\` (session \`${other.session}\`, agent \`${other.agent}\`)`,
      );
    else user.push(`\`${path}\``);
  }
  return WHO_CHANGED({
    own: own.join(", "),
    others: others.join(", "),
    user: user.join(", "),
  });
};
