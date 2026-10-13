// The rules of the `attribution` hook on a `Bash` command: the `--trailer` of `git commit`, and the footer of `gh pr create --body`.
// A command with no commit and no pull request is left alone, and so is a command the shell reader cannot read.
// The functions are pure and import only `shell.ts`.

import type { Lines } from "./lines.ts";
import { simpleCommands, type Word } from "./shell.ts";

/** A text change of the command: the span `from` to `to` becomes `text`, with offsets in the command. */
type Edit = { from: number; to: number; text: string };

/** The options of `git` that take a value before the subcommand. */
const GIT_WITH_VALUE = new Set(["-C", "-c"]);
/** The options of `git commit` that make no commit. */
const NO_COMMIT = new Set(["--dry-run", "--no-commit", "-h", "--help"]);
/** An assignment before a command, such as `FOO=1`. */
const ASSIGNMENT = /^[A-Za-z_]\w*=/;
/** The opening of a quoted heredoc in a body: `"$(cat <<'EOF'` and a line break. */
const HEREDOC_BODY = /^"\$\(cat <<'([A-Za-z_]\w*)'\n/;

/** The text inside double quotes, with the characters that the shell reads escaped. */
const inDouble = (text: string) => text.replace(/[\\"$`]/g, "\\$&");

/** The word of `git commit` in a simple command, when the command makes a commit. */
const commitWord = (words: Word[]): Word | undefined => {
  let i = 0;
  while (i < words.length && ASSIGNMENT.test(words[i]?.raw ?? "")) i++;
  if (words[i]?.raw !== "git") return undefined;
  i++;
  while (GIT_WITH_VALUE.has(words[i]?.raw ?? "")) i += 2;
  const word = words[i];
  if (word?.raw !== "commit") return undefined;
  if (words.slice(i + 1).some((w) => NO_COMMIT.has(w.raw))) return undefined;
  return word;
};

/** The word that holds the body of `gh pr create`, the value of its last `--body` or `-b`. */
const bodyWord = (words: Word[]): Word | undefined => {
  if (words[0]?.raw !== "gh" || words[1]?.raw !== "pr") return undefined;
  if (words[2]?.raw !== "create") return undefined;
  let body: Word | undefined;
  for (let i = 3; i < words.length; i++) {
    const raw = words[i]?.raw ?? "";
    if (raw.startsWith("--body=")) return undefined;
    if (raw === "--body" || raw === "-b") {
      body = words[i + 1];
      i++;
    }
  }
  return body;
};

/**
 * The edit that appends `line` to the body in `word`, or undefined when the body has no form it can read.
 * A quoted heredoc gets the line before its closing line, and a quoted string before its closing quote.
 */
const bodyEdit = (word: Word, line: string): Edit | undefined => {
  const raw = word.raw;
  const at = (rel: number, text: string): Edit => ({
    from: word.start + rel,
    to: word.start + rel,
    text,
  });
  const head = HEREDOC_BODY.exec(raw);
  if (head) {
    const delimiter = head[1] ?? "";
    let pos = head[0].length;
    while (pos < raw.length) {
      const eol = raw.indexOf("\n", pos);
      const stop = eol < 0 ? raw.length : eol;
      if (raw.slice(pos, stop) === delimiter) return at(pos, `\n${line}\n`);
      if (eol < 0) break;
      pos = eol + 1;
    }
    return undefined;
  }
  if (raw.length < 2) return undefined;
  if (raw.startsWith('"') && raw.endsWith('"'))
    return at(raw.length - 1, `\n\n${inDouble(line)}`);
  if (raw.startsWith("'") && raw.endsWith("'") && !line.includes("'"))
    return at(raw.length - 1, `\n\n${line}`);
  return undefined;
};

/**
 * The command after the attribution, or undefined when no part of it changes.
 * A line that the part of the command for the same commit or pull request already holds is not added again, and an empty line is off.
 * That part runs from the first word of the command to the first word of the next command, so a chain gives each commit its own line.
 * `--trailer` goes right after `commit`, so it comes before any heredoc or message option.
 */
export const attributeCommand = (
  command: string,
  lines: Lines,
): string | undefined => {
  const commands = simpleCommands(command);
  if (commands === null) return undefined;
  const edits: Edit[] = [];
  for (const [i, words] of commands.entries()) {
    const from = words[0]?.start ?? 0;
    const to = commands[i + 1]?.[0]?.start ?? command.length;
    const part = command.slice(from, to);
    const commit = commitWord(words);
    if (commit && lines.commit && !part.includes(lines.commit)) {
      const text = ` --trailer "${inDouble(lines.commit)}"`;
      edits.push({ from: commit.end, to: commit.end, text });
    }
    const body = bodyWord(words);
    if (body && lines.pr && !part.includes(lines.pr)) {
      const edit = bodyEdit(body, lines.pr);
      if (edit) edits.push(edit);
    }
  }
  if (edits.length === 0) return undefined;
  return edits
    .sort((a, b) => b.from - a.from)
    .reduce(
      (text, e) => text.slice(0, e.from) + e.text + text.slice(e.to),
      command,
    );
};

/** True when the command has a `git commit` or a `gh pr create` that the attribution may change. */
export const needsAttribution = (command: string): boolean => {
  const commands = simpleCommands(command);
  return (commands ?? []).some(
    (words) => commitWord(words) !== undefined || bodyWord(words) !== undefined,
  );
};
