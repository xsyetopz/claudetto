// The scan of `shell.ts`: one pass over a text with a stack of frames, one for each substitution, parenthesis, and backtick.
// The function is pure and imports only `shellkinds.ts` and the files of this folder.

import { RESERVED } from "../shellkinds.ts";
import { ansiEscape } from "./ansi-c.ts";
import { expandBraces } from "./braces.ts";
import { delimiterAt } from "./delimiter.ts";

/** A frame of the scan: one `$(`, backtick, or parenthesis, with the words of its command so far. */
type Frame = {
  closer: string | null;
  body: boolean;
  line: string[];
  word: string | null;
  quote: string | null;
  skip: string | false;
  heredocs: Heredoc[];
  outs: string[];
  start: number | null;
  raws: string[];
  marks: number[];
  depth: number;
};

type Heredoc = {
  delimiter: string;
  quoted: boolean;
  head: string[];
  outs: string[];
};

/** The quote states of an ANSI-C quote (`$'...'`): the text, and the text after a `\0`, which the shell drops. */
const ANSI = "$'";
const ANSI_DROP = "$'\0";
const ansi = (f: Frame): boolean => f.quote === ANSI || f.quote === ANSI_DROP;

const frame = (
  closer: string | null,
  body = false,
  start: number | null = null,
): Frame => ({
  closer,
  body,
  line: [],
  word: null,
  quote: null,
  skip: false,
  heredocs: [],
  outs: [],
  start,
  raws: [],
  marks: [],
  depth: 0,
});

/** The closer of an arithmetic frame (`$(( ))`), whose words are not a command. */
const ARITH = "))";

/**
 * True when the `$((` at `at` is arithmetic: its parentheses match up to a `))`.
 * A quote, a backtick, or a backslash before that point gives false, so the text keeps the stricter reading of a substitution.
 * The shell reads `$((cmd) )` as a substitution that holds a subshell, and so does this check.
 */
const arithmeticAt = (text: string, at: number): boolean => {
  let depth = 0;
  for (let j = at + 3; j < text.length; j++) {
    const c = text[j] as string;
    if ("'\"`\\".includes(c)) return false;
    if (c === "(") depth++;
    else if (c === ")" && depth) depth--;
    else if (c === ")") return text[j + 1] === ")";
  }
  return false;
};

/** The state of one scan: the text, the stack of frames, and the callbacks of `scan`. */
type Ctx = {
  text: string;
  stack: Frame[];
  emit: (argv: string[]) => void;
  redirect: (op: string, target: string, line: string[]) => void;
  heredoc: (
    doc: string,
    quoted: boolean,
    head: string[],
    outs: string[],
  ) => void;
  background: (line: string[]) => void;
};

const push = (x: Ctx, f: Frame): void => {
  if (f.word !== null) {
    // A word that is only substitutions is unreadable, so it is `""`, as before.
    const w = f.word === f.raws.join("") ? "" : f.word;
    if (f.skip) {
      x.redirect(f.skip, w, f.line);
      if (f.skip.includes(">")) f.outs.push(w);
    } else if (w && f.marks.length) f.line.push(...expandBraces(w, f.marks));
    else f.line.push(w);
    f.skip = false;
  }
  f.word = null;
  f.raws = [];
  f.marks = [];
};

const end = (x: Ctx, f: Frame): void => {
  push(x, f);
  while (f.line.length && RESERVED.has(f.line[0] as string)) f.line.shift();
  // The text of an unquoted heredoc body is data, so only its substitutions are commands.
  if (f.line.length && !f.body) x.emit(f.line);
  f.line = [];
  f.outs = [];
};

// The source text of a substitution goes into its word, so the words after it stay with it.
const addRaw = (f: Frame, raw: string): void => {
  f.word = (f.word ?? "") + raw;
  f.raws.push(raw);
};

const open = (x: Ctx, f: Frame, closer: string, at: number): void => {
  f.word ??= "";
  x.stack.push(frame(closer, false, at));
};

// A `$(` opens a substitution, and a `$((` with a matching `))` opens an arithmetic frame.
const openDollar = (x: Ctx, f: Frame, at: number): number => {
  if (x.text[at + 2] !== "(" || !arithmeticAt(x.text, at)) {
    open(x, f, ")", at);
    return at + 1;
  }
  f.word ??= "";
  x.stack.push(frame(ARITH, true, at));
  return at + 2;
};

const close = (x: Ctx, f: Frame, at: number): void => {
  end(x, f);
  x.stack.pop();
  if (f.start !== null)
    addRaw(x.stack.at(-1) as Frame, x.text.slice(f.start, at + 1));
};

/** Each handler below gets the index `i` of the character `c` and gives the index of the last character that it read. */
const escapeAt = (f: Frame, text: string, i: number): number => {
  const n = text[i + 1] as string;
  if (n !== "\n")
    f.word = (f.word ?? "") + (f.quote && !'$`"\\'.includes(n) ? "\\" : "") + n;
  return i + 1;
};

// Only the substitutions of an arithmetic text are commands.
const arithAt = (x: Ctx, f: Frame, i: number, c: string): number => {
  if (c === "$" && x.text[i + 1] === "(") return openDollar(x, f, i);
  if (c === "(") f.depth++;
  else if (c === ")" && f.depth) f.depth--;
  else if (c === ")") {
    close(x, f, i + 1);
    return i + 1;
  }
  return i;
};

// A `\0` ends the text of the quote, so the characters after it up to the quote are dropped.
const ansiAt = (f: Frame, text: string, i: number, c: string): number => {
  if (c === "'") f.quote = null;
  else if (c === "\\" && i + 1 < text.length) {
    const { char, last } = ansiEscape(text, i + 1);
    if (char === "\0") f.quote = ANSI_DROP;
    else if (f.quote === ANSI) f.word += char;
    return last;
  } else if (f.quote === ANSI) f.word += c;
  return i;
};

const dquoteAt = (x: Ctx, f: Frame, i: number, c: string): number => {
  if (c === '"' && !f.body) f.quote = null;
  else if (c === "$" && x.text[i + 1] === "(") return openDollar(x, f, i);
  else if (c === "`") open(x, f, "`", i);
  else f.word = (f.word ?? "") + c;
  return i;
};

/** The heredoc operator `<<` or `<<-` at `i`: its delimiter waits for the end of the line. */
const heredocOpAt = (x: Ctx, f: Frame, i: number): number => {
  const at = x.text[i + 2] === "-" ? i + 3 : i + 2;
  const d = delimiterAt(x.text, at);
  if (d)
    f.heredocs.push({
      delimiter: d.word,
      quoted: d.quoted,
      head: [...f.line],
      outs: f.outs,
    });
  push(x, f);
  return (d ? d.end : at) - 1;
};

const redirectAt = (x: Ctx, f: Frame, i: number): number => {
  const { text } = x;
  if (f.word !== null && /^\d+$/.test(f.word)) f.word = null;
  push(x, f);
  let last = i;
  while ("<>".includes(text[last + 1] ?? " ")) last++;
  if ("&|".includes(text[last + 1] ?? " ")) last++;
  f.skip = text.slice(i, last + 1);
  return last;
};

/** The end of the body that starts at `from`: the index after its last line, and the index of the line of `delimiter`. */
const bodyEnd = (
  text: string,
  from: number,
  delimiter: string,
): { stop: number; pos: number } => {
  let pos = from;
  let stop = from;
  while (pos < text.length) {
    const nl = text.indexOf("\n", pos);
    const lineEnd = nl < 0 ? text.length : nl;
    if (text.slice(pos, lineEnd).trim() === delimiter) break;
    pos = stop = nl < 0 ? text.length : nl + 1;
  }
  return { stop, pos };
};

/** A newline ends the command, and then the bodies of the heredocs of its line follow. */
const newlineAt = (x: Ctx, f: Frame, i: number): number => {
  end(x, f);
  let pos = i + 1;
  for (const { delimiter, quoted, head, outs } of f.heredocs.splice(0)) {
    const start = pos;
    const body = bodyEnd(x.text, pos, delimiter);
    if (body.stop > start)
      x.heredoc(x.text.slice(start, body.stop), quoted, head, outs);
    const nl = x.text.indexOf("\n", body.pos);
    pos = nl < 0 ? x.text.length : nl + 1;
  }
  return pos - 1;
};

const separatorAt = (x: Ctx, f: Frame, i: number, c: string): void => {
  if (
    c === "&" &&
    !f.body &&
    !"&>".includes(x.text[i + 1] ?? " ") &&
    !"&|".includes(x.text[i - 1] ?? " ")
  ) {
    push(x, f);
    x.background([...f.line]);
  }
  end(x, f);
};

const wordCharAt = (f: Frame, text: string, i: number, c: string): void => {
  // An unquoted brace or comma can expand, except the brace of `${`.
  if ("{,}".includes(c) && !(c === "{" && text[i - 1] === "$"))
    f.marks.push((f.word ?? "").length);
  f.word = (f.word ?? "") + c;
};

const operatorAt = (x: Ctx, f: Frame, i: number, c: string): number => {
  if (c === "<" && x.text[i + 1] === "<" && x.text[i + 2] !== "<")
    return heredocOpAt(x, f, i);
  if (c === "<" || c === ">") return redirectAt(x, f, i);
  if (c === "\n") return newlineAt(x, f, i);
  if (c === "(") {
    end(x, f);
    f.skip = false;
    x.stack.push(frame(")"));
  } else if (c === ")") {
    if (f.closer === ")") close(x, f, i);
    else end(x, f);
  } else if (";&|".includes(c)) separatorAt(x, f, i, c);
  else if (/\s/.test(c)) push(x, f);
  else wordCharAt(f, x.text, i, c);
  return i;
};

const unquotedAt = (x: Ctx, f: Frame, i: number, c: string): number => {
  const next = x.text[i + 1];
  if (c === "`") {
    if (f.closer === "`") close(x, f, i);
    else open(x, f, "`", i);
  } else if (c === "$" && next === "(") return openDollar(x, f, i);
  else if (c === "$" && next === "'") {
    f.quote = ANSI;
    f.word ??= "";
    return i + 1;
  } else if (c === "'" || c === '"') {
    f.quote = c;
    f.word ??= "";
  } else if (c === "#" && f.word === null) {
    const nl = x.text.indexOf("\n", i);
    return nl < 0 ? x.text.length : nl - 1;
  } else return operatorAt(x, f, i, c);
  return i;
};

/** Reads the character at `i` by the state of the top frame, and gives the index of the last character that it read. */
const step = (x: Ctx, i: number): number => {
  const f = x.stack.at(-1) as Frame;
  const c = x.text[i] as string;
  if (c === "\\" && i + 1 < x.text.length && f.quote !== "'" && !ansi(f))
    return escapeAt(f, x.text, i);
  if (f.closer === ARITH) return arithAt(x, f, i, c);
  if (f.quote === "'") {
    if (c === "'") f.quote = null;
    else f.word += c;
    return i;
  }
  if (ansi(f)) return ansiAt(f, x.text, i, c);
  if (f.quote === '"') return dquoteAt(x, f, i, c);
  return unquotedAt(x, f, i, c);
};

/**
 * One pass over `text` with a stack of frames, one for each `$(`, backtick, and parenthesis.
 * `emit(argv)` gets each simple command.
 * `redirect(op, target, line)` gets each redirection operator with the word after it and the words of its command so far.
 * `heredoc(doc, quoted, head, outs)` gets each heredoc body with the words of its command and the output targets of that command.
 * `background(line)` gets the words of each command that a lone `&` ends, and an empty list after a group such as `(a; b) &`.
 * The `&` of `&&`, `&>`, `|&`, and `>&` does not start a background job.
 */
export const scan = (
  text: string,
  emit: (argv: string[]) => void,
  body: boolean,
  redirect: (op: string, target: string, line: string[]) => void,
  heredoc: (
    doc: string,
    quoted: boolean,
    head: string[],
    outs: string[],
  ) => void,
  background: (line: string[]) => void = () => {},
): void => {
  const first = frame(null, body);
  if (body) first.quote = '"';
  const x: Ctx = { text, stack: [first], emit, redirect, heredoc, background };
  for (let i = 0; i < text.length; i++) i = step(x, i);
  while (x.stack.length) {
    const top = x.stack.pop() as Frame;
    if (top.start !== null)
      addRaw(x.stack.at(-1) as Frame, text.slice(top.start));
    end(x, top);
  }
};
