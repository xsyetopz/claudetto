// The shell reader of the `attribution` hook: it splits a `Bash` command into simple commands, and each simple command into words.
// A word keeps its raw text, quotes included, and its span in the command, so a rule can insert text at a span.
// The reader knows the quotes, the escapes, the separators, and the heredoc operator, and no `git` or `gh` rule.
// It returns null for a command it cannot read, such as an unclosed quote or a heredoc with no closing line,
// so the caller runs that command unchanged.

/** A word of a simple command: its raw text, and the start and the end of the word in the command. */
export type Word = { raw: string; start: number; end: number };

/** A heredoc whose body starts after the current line: its delimiter, and whether `<<-` strips the tabs. */
type Heredoc = { delimiter: string; strip: boolean };

/** A heredoc operator at a position, read with a sticky match. */
const OPERATOR = /<<(-?)[ \t]*(?:'([^'\n]+)'|"([^"\n]+)"|([A-Za-z_][\w-]*))/y;

/** The index after the closing line of a heredoc body that starts at `from`, or null when no line closes it. */
const bodyEnd = (
  command: string,
  from: number,
  doc: Heredoc,
): number | null => {
  let at = from;
  for (;;) {
    const eol = command.indexOf("\n", at);
    const stop = eol < 0 ? command.length : eol;
    const line = command.slice(at, stop);
    if ((doc.strip ? line.replace(/^\t+/, "") : line) === doc.delimiter)
      return Math.min(stop + 1, command.length);
    if (eol < 0) return null;
    at = eol + 1;
  }
};

/**
 * The simple commands of `command`, each as its words in order.
 * A separator (`;`, `&`, `|`, `(`, `)`, or a line break) ends a simple command.
 * A quote, an escape, or a heredoc keeps its text in one word or one body.
 */
export const simpleCommands = (command: string): Word[][] | null => {
  const out: Word[][] = [];
  let words: Word[] = [];
  let start: number | null = null;
  let quote: '"' | "'" | null = null;
  let pending: Heredoc[] = [];
  const mark = (at: number) => {
    if (start === null) start = at;
  };
  const close = (end: number) => {
    if (start !== null)
      words.push({ start, end, raw: command.slice(start, end) });
    start = null;
  };
  const endCommand = (end: number) => {
    close(end);
    if (words.length) out.push(words);
    words = [];
  };
  let i = 0;
  while (i < command.length) {
    const ch = command.charAt(i);
    if (quote === "'") {
      if (ch === "'") quote = null;
      i++;
      continue;
    }
    if (ch === "\n" && quote === null) endCommand(i);
    if (ch === "\n" && pending.length) {
      let at = i + 1;
      for (const doc of pending) {
        const end = bodyEnd(command, at, doc);
        if (end === null) return null;
        at = end;
      }
      pending = [];
      i = at;
      continue;
    }
    if (quote === '"') {
      if (ch === "\\") i += 2;
      else if (ch === '"') {
        quote = null;
        i++;
      } else if (ch === "<" && readOperator(command, i, pending)) {
        i = OPERATOR.lastIndex;
      } else i++;
      continue;
    }
    if (ch === " " || ch === "\t") close(i);
    else if (ch === "\n" || ";&|()".includes(ch)) endCommand(i);
    else if (ch === "\\") {
      mark(i);
      i += 2;
      continue;
    } else if (ch === "'" || ch === '"') {
      mark(i);
      quote = ch;
    } else if (ch === "<" && readOperator(command, i, pending)) {
      close(i);
      i = OPERATOR.lastIndex;
      continue;
    } else mark(i);
    i++;
  }
  if (quote !== null || pending.length) return null;
  endCommand(command.length);
  return out;
};

/** Reads the heredoc operator at `at` into `pending`, and leaves `OPERATOR.lastIndex` after it. */
const readOperator = (command: string, at: number, pending: Heredoc[]) => {
  OPERATOR.lastIndex = at;
  const found = OPERATOR.exec(command);
  if (!found) return false;
  const [, dash = "", single, double, bare] = found;
  const delimiter = single ?? double ?? bare ?? "";
  pending.push({ delimiter, strip: dash === "-" });
  return true;
};
