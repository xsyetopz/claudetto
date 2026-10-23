// The one shell reader of claudetto, for the guards. It cannot run the shell, so it reads only the syntax that decides which command runs:
// words, quotes, the operators between simple commands, nested scripts, and the wrapper commands.
// The scan is in `shell/scan.ts`, the word splitter is in `wrappers.ts`, and the kinds of command are in `shellkinds.ts`.

import { SHELL_SCAN_MAX_CHARS } from "./budget.ts";
import { scan } from "./shell/scan.ts";
import {
  bodyKind,
  hiddenLevel,
  readsScript,
  runsCode,
  scriptOf,
} from "./shellkinds.ts";
import { stripWrappers } from "./wrappers.ts";

/** A text that `parse` scans later, with the words of its heredoc when it has one. */
type Queued = { text: string; body: boolean };

type Held = Queued & { outs: string[] };

type Redirect = { op: string; target: string };

type ParseResult = {
  commands: string[][];
  redirects: Redirect[];
  code: string[];
  background: string[][];
  truncated: boolean;
};

/**
 * The simple commands of `text` as lists of words, and whether the scan stopped at `SHELL_SCAN_MAX_CHARS`.
 * A command ends at `;`, `&&`, `||`, `|`, `&`, a newline, or a parenthesis.
 * Redirections, comments, quoted heredoc bodies, and the reserved words before a command (`if`, `then`, `{`, `!`) are not in the list.
 * The commands inside `$(...)`, backticks, an unquoted heredoc, `sh -c '...'`, `bash -c`, and `eval` are in the list too.
 * A wrapper such as `sudo` stays in front of its command: `stripWrappers` removes it.
 * The commands of a quoted heredoc or a here-string are in the list when a shell reads it (`bash <<'EOF'`), or when the text runs a script that the reader cannot see (`hiddenLevel`).
 * `code` lists each text that a program other than the shell can run as code (`runsCode`):
 * a heredoc body or a here-string that it reads, an argument with a space, a bracket, or a `;` (`python3 -c '...'`),
 * and a heredoc body that a data command writes to a file that such a program names, or to its standard output when the text runs such a program.
 * `redirects` lists the operator and the target word of each output redirection (`>`, `>>`, `>|`), except a file descriptor such as the `1` of `2>&1`.
 * `background` lists the words of each command that a lone `&` puts in the background.
 */
export const parse = (text: unknown): ParseResult => {
  const out: string[][] = [];
  const redirects: Redirect[] = [];
  const code: string[] = [];
  const background: string[][] = [];
  const queue: Queued[] = [{ text: String(text ?? ""), body: false }];
  const seen = new Set<string>();
  const held: { feed: Held[]; data: Held[] } = { feed: [], data: [] };
  let scanned = 0;
  let hidden = 0;
  const later = (t: string, body = false) => queue.push({ text: t, body });
  const redirect = (op: string, target: string, line: string[]) => {
    if (op.startsWith(">") && !/^(?:\d+|-)$/.test(target))
      redirects.push({ op, target });
    if (op !== "<<<") return;
    if (readsScript(line)) later(target);
    else if (runsCode(line)) code.push(target);
  };
  const heredoc = (
    doc: string,
    quoted: boolean,
    head: string[],
    outs: string[],
  ) => {
    // The shell expands an unquoted body, so its substitutions run.
    if (!quoted) later(doc, true);
    const kind = bodyKind(head);
    if (kind === "script") later(doc);
    else if (kind === "code") code.push(doc);
    else held[kind].push({ text: doc, body: false, outs });
  };
  const emit = (argv: string[]) => {
    out.push(argv);
    const script = scriptOf(argv);
    if (script) later(script);
    hidden = Math.max(hidden, hiddenLevel(argv, script));
    if (runsCode(argv))
      code.push(
        ...stripWrappers(argv)
          .slice(1)
          .filter((w) => /[\s(){};]/.test(w)),
      );
  };
  /** Queues the held bodies that `hidden` can run. True when it queued one. */
  const release = () => {
    const ready = [
      ...(hidden > 0 ? held.feed.splice(0) : []),
      ...(hidden > 1 ? held.data.splice(0) : []),
    ];
    queue.push(...ready);
    return ready.length > 0;
  };
  const result = (truncated: boolean) => ({
    commands: out,
    redirects,
    code,
    background,
    truncated,
  });
  for (let n = 0; n < queue.length || release(); n++) {
    const { text: next, body } = queue[n] as Queued;
    const key = `${body}:${next}`;
    if (seen.has(key)) continue;
    seen.add(key);
    scanned += next.length;
    if (scanned > SHELL_SCAN_MAX_CHARS) return result(true);
    scan(next, emit, body, redirect, heredoc, (line) => background.push(line));
  }
  // A data body is code when a program reads the file that it is written to, or its standard output.
  const programs = out.filter(runsCode);
  for (const { text: doc, outs } of held.data)
    if (
      outs.length
        ? outs.some((t) => programs.some((argv) => argv.includes(t)))
        : programs.length > 0
    )
      code.push(doc);
  return result(false);
};

export const commands = (text: unknown): string[][] => parse(text).commands;
