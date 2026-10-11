// The one shell reader of dotclaude, for the guards in `features/`.
// It cannot run the shell, so it reads only the syntax that decides which command runs:
// words, quotes, the operators between simple commands, nested scripts, and the wrapper commands.
// Text that another program runs as code is in the `code` list of `parse`, for the reader of `code.mjs`.
// The functions are pure and import only `budget.mjs`, `shellkinds.mjs`, and `wrappers.mjs`.

import { SHELL_SCAN_MAX_CHARS } from "./budget.mjs";
import {
  bodyKind,
  hiddenLevel,
  RESERVED,
  readsScript,
  runsCode,
  scriptOf,
} from "./shellkinds.mjs";
import { stripWrappers } from "./wrappers.mjs";

/** The words of one shell segment, with quotes and backslashes removed, also inside a word (`r''m`, `\rm`). */
export const words = (text) =>
  [...String(text).matchAll(/(?:'[^']*'|"[^"]*"|\\.|[^\s'"\\])+/g)].map((m) =>
    m[0].replace(/'([^']*)'|"([^"]*)"|\\(.)/g, (_, a, b, c) => a ?? b ?? c),
  );

const frame = (closer, body = false) => ({
  closer,
  body,
  line: [],
  word: null,
  quote: null,
  skip: false,
  heredocs: [],
  outs: [],
});

/**
 * One pass over `text` with a stack of frames, one for each `$(`, backtick, and parenthesis.
 * `emit(argv)` gets each simple command.
 * `redirect(op, target, line)` gets each redirection operator with the word after it and the words of its command so far.
 * `heredoc(doc, quoted, head, outs)` gets each heredoc body with the words of its command and the output targets of that command.
 */
function scan(text, emit, body, redirect, heredoc) {
  const stack = [frame(null, body)];
  if (body) stack[0].quote = '"';
  const push = (f) => {
    if (f.word !== null) {
      if (f.skip) {
        redirect(f.skip, f.word, f.line);
        if (f.skip.includes(">")) f.outs.push(f.word);
      } else f.line.push(f.word);
      f.skip = false;
    }
    f.word = null;
  };
  const end = (f) => {
    push(f);
    while (f.line.length && RESERVED.has(f.line[0])) f.line.shift();
    if (f.line.length) emit(f.line);
    f.line = [];
    f.outs = [];
  };
  const open = (f, closer) => {
    f.word ??= "";
    stack.push(frame(closer));
  };
  const close = (f) => {
    end(f);
    stack.pop();
  };
  for (let i = 0; i < text.length; i++) {
    const f = stack.at(-1);
    const c = text[i];
    if (c === "\\" && i + 1 < text.length && f.quote !== "'") {
      const n = text[++i];
      if (n === "\n") continue;
      f.word =
        (f.word ?? "") + (f.quote && !'$`"\\'.includes(n) ? "\\" : "") + n;
    } else if (f.quote === "'") {
      if (c === "'") f.quote = null;
      else f.word += c;
    } else if (f.quote === '"') {
      if (c === '"' && !f.body) f.quote = null;
      else if (c === "$" && text[i + 1] === "(") {
        open(f, ")");
        i++;
      } else if (c === "`") open(f, "`");
      else f.word += c;
    } else if (c === "`") {
      if (f.closer === "`") close(f);
      else open(f, "`");
    } else if (c === "$" && text[i + 1] === "(") {
      open(f, ")");
      i++;
    } else if (c === "'" || c === '"') {
      f.quote = c;
      f.word ??= "";
    } else if (c === "#" && f.word === null) {
      const nl = text.indexOf("\n", i);
      i = nl < 0 ? text.length : nl - 1;
    } else if (c === "<" && text[i + 1] === "<" && text[i + 2] !== "<") {
      const m = /^<<-?\s*(\\?)(["']?)([A-Za-z_]\w*)\2/.exec(
        text.slice(i, i + 200),
      );
      if (m)
        f.heredocs.push({
          delimiter: m[3],
          quoted: !!(m[1] || m[2]),
          head: [...f.line],
          outs: f.outs,
        });
      i += m ? m[0].length - 1 : 1;
      push(f);
    } else if (c === "<" || c === ">") {
      if (f.word !== null && /^\d+$/.test(f.word)) f.word = null;
      push(f);
      const from = i;
      while ("<>".includes(text[i + 1] ?? " ")) i++;
      if ("&|".includes(text[i + 1] ?? " ")) i++;
      f.skip = text.slice(from, i + 1);
    } else if (c === "\n") {
      end(f);
      let pos = i + 1;
      for (const { delimiter, quoted, head, outs } of f.heredocs.splice(0)) {
        const start = pos;
        let stop = pos;
        while (pos < text.length) {
          const nl = text.indexOf("\n", pos);
          const line = text.slice(pos, nl < 0 ? text.length : nl);
          const next = nl < 0 ? text.length : nl + 1;
          if (line.trim() === delimiter) break;
          pos = stop = next;
        }
        const doc = text.slice(start, stop);
        if (stop > start) heredoc(doc, quoted, head, outs);
        const nl = text.indexOf("\n", pos);
        pos = nl < 0 ? text.length : nl + 1;
      }
      i = pos - 1;
    } else if (c === "(") {
      end(f);
      f.skip = false;
      stack.push(frame(")"));
    } else if (c === ")") {
      if (f.closer === ")") close(f);
      else end(f);
    } else if (";&|".includes(c)) end(f);
    else if (/\s/.test(c)) push(f);
    else f.word = (f.word ?? "") + c;
  }
  while (stack.length) end(stack.pop());
}

/**
 * The simple commands of `text` as lists of words, and whether the scan stopped at `SHELL_SCAN_MAX_CHARS`.
 * A command ends at `;`, `&&`, `||`, `|`, `&`, a newline, or a parenthesis.
 * Redirections, comments, quoted heredoc bodies, and the reserved words before a command (`if`, `then`, `{`, `!`) are not in the list.
 * The commands inside `$(...)`, backticks, an unquoted heredoc, `sh -c '...'`, `bash -c`, and `eval` are in the list too.
 * A wrapper such as `sudo` stays in front of its command: `stripWrappers` removes it.
 * The commands of a quoted heredoc are in the list when a shell reads it (`bash <<'EOF'`), or when the text runs a script that the reader cannot see (`hiddenLevel`), which a `while read` loop can take from the heredoc.
 * The text of a here-string given to a shell (`bash <<< '...'`) is a script too.
 * `code` lists each text that a program other than the shell can run as code (`runsCode`):
 * a heredoc body or a here-string that it reads, an argument with a space, a bracket, or a `;` (`python3 -c '...'`),
 * and a heredoc body that a data command writes to a file that such a program names, or to its standard output when the text runs such a program.
 * `redirects` lists the operator and the target word of each output redirection (`>`, `>>`, `>|`), except a file descriptor such as the `1` of `2>&1`.
 * The `&` of `&>` ends the command before it, so its operator is `>`.
 * The cost grows with the length of `text`, because one pass with a stack finds the substitutions.
 */
export function parse(text) {
  const out = [];
  const redirects = [];
  const code = [];
  const redirect = (op, target, line) => {
    if (op.startsWith(">") && !/^(?:\d+|-)$/.test(target))
      redirects.push({ op, target });
    if (op !== "<<<") return;
    if (readsScript(line)) later(target);
    else if (runsCode(line)) code.push(target);
  };
  const queue = [{ text: String(text ?? ""), body: false }];
  const seen = new Set();
  let scanned = 0;
  const held = { feed: [], data: [] };
  let hidden = 0;
  const later = (t, body = false) => queue.push({ text: t, body });
  const heredoc = (doc, quoted, head, outs) => {
    // The shell expands an unquoted body, so its substitutions run.
    if (!quoted) later(doc, true);
    const kind = bodyKind(head);
    if (kind === "script") later(doc);
    else if (kind === "code") code.push(doc);
    else held[kind].push({ text: doc, body: false, outs });
  };
  const emit = (argv) => {
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
  for (let n = 0; n < queue.length || release(); n++) {
    const { text: next, body } = queue[n];
    const key = `${body}:${next}`;
    if (seen.has(key)) continue;
    seen.add(key);
    scanned += next.length;
    if (scanned > SHELL_SCAN_MAX_CHARS)
      return { commands: out, redirects, code, truncated: true };
    scan(next, emit, body, redirect, heredoc);
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
  return { commands: out, redirects, code, truncated: false };
}

/** The simple commands of `text`, as `parse` reads them. */
export const commands = (text) => parse(text).commands;
