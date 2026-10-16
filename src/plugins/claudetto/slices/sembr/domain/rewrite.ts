// The rules of the `sembr` hooks (design D29): the rewrite of a write and of an edit, the repair of a cross-sentence `old_string`,
// and the rewrite of a quoted heredoc in a commit command.
// The functions are pure and import only `split.ts` and the kernel.

import type { Args } from "claude-code";
import { isMarkdown } from "../../../../../kernel/text.ts";
import { sembr, sembrCounts } from "./split.ts";

type WriteCall = Extract<
  Args<"tool.call">,
  { content: string; file_path: string }
>;
type EditCall = Extract<Args<"tool.call">, { old_string: string }>;
type BashCall = Extract<Args<"tool.call">, { command: string }>;

/**
 * The text of a `Write` after the rewrite, or undefined when it needs no change.
 */
export const rewriteContent = (content: unknown) => {
  if (typeof content !== "string") return undefined;
  const out = sembr(content);
  return out === content ? undefined : out;
};

/**
 * The `new_string` of an `Edit` after the rewrite, or undefined when it stays.
 * `file` is the text of the file before the edit, or `null` when it does not exist.
 * The rewrite applies only when `new_string` starts and ends at line bounds of the file.
 * The split runs on the whole file after the edit, so a fence or a table around the lines keeps them.
 */
export const rewriteEdit = (
  input:
    | {
        old_string?: unknown;
        new_string?: unknown;
        replace_all?: unknown;
      }
    | null
    | undefined,
  file: string | null,
) => {
  const { old_string: old, new_string: next } = input ?? {};
  if (typeof old !== "string" || typeof next !== "string") return undefined;
  if (next === "") return undefined;
  if (old === "") return file ? undefined : rewriteContent(next);
  if (file == null || input?.replace_all) return undefined;
  const at = file.indexOf(old);
  if (at < 0 || file.indexOf(old, at + 1) >= 0) return undefined;
  const after = file.slice(0, at) + next + file.slice(at + old.length);
  const end = at + next.length;
  const trailing = next.endsWith("\n");
  if (at > 0 && after[at - 1] !== "\n") return undefined;
  const atCr = after[end] === "\r" && after[end + 1] === "\n";
  if (!trailing && end < after.length && after[end] !== "\n" && !atCr)
    return undefined;
  const first = after.slice(0, at).split("\n").length - 1;
  const size = next.split("\n").length - (trailing ? 1 : 0);
  const counts = sembrCounts(after);
  const lines = sembr(after).split("\n");
  let from = 0;
  for (let i = 0; i < first; i++) from += counts[i] ?? 0;
  let length = 0;
  for (let i = first; i < first + size; i++) length += counts[i] ?? 0;
  const joined = lines.slice(from, from + length).join("\n");
  // The text after `new_string` ends the line with its own CR, so the last output line gives up its CR.
  const body =
    !trailing && atCr && !next.endsWith("\r") ? joined.slice(0, -1) : joined;
  const out = trailing ? `${body}\n` : body;
  return out === next ? undefined : out;
};

/** The prefix of a continuation line in a list item or a quote: the indent and the quote marks. */
const CONTINUATION = /^[ \t]*(?:>[ \t]*)*/;

/** `text` with each character of a regular expression escaped. */
const escapeRe = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * `text` split into sentences, where each line that the split adds has `prefix` in place of the prefix of its own.
 */
const splitWithPrefix = (text: string, prefix: string) => {
  const counts = sembrCounts(text);
  const lines = sembr(text).split("\n");
  let at = 0;
  for (const count of counts) {
    for (let i = 1; i < count; i++)
      lines[at + i] = prefix + (lines[at + i] ?? "").replace(CONTINUATION, "");
    at += count;
  }
  return lines.join("\n");
};

/**
 * The repaired `old_string` and `new_string` of an `Edit` whose `old_string` crosses a sentence end,
 * or undefined when `old_string` matches as written or its split form is not in the file either.
 * The split form of a list item or a quote has the marker or the indent of the item in each line it adds.
 * An `old_string` that starts inside such a line has no marker to give them,
 * so the match takes the prefix from the file, and the `new_string` gets the same prefix.
 */
export const repairEdit = (
  file: string | null,
  old: unknown,
  next: unknown,
) => {
  if (typeof file !== "string" || typeof old !== "string" || old === "")
    return undefined;
  if (file.includes(old)) return undefined;
  const split = sembr(old);
  if (split === old) return undefined;
  const replacement = String(next ?? "");
  if (file.includes(split))
    return { old_string: split, new_string: sembr(replacement) };
  const pieces = split.split("\n");
  const pattern = pieces
    .map((p, i) =>
      escapeRe((i === 0 ? p : p.replace(CONTINUATION, "")).replace(/\r$/, "")),
    )
    .join("\r?\n[ \\t]*(?:>[ \\t]*)*");
  const found = [...file.matchAll(new RegExp(pattern, "g"))];
  const [match, ...others] = found;
  if (!match || others.length > 0) return undefined;
  const prefix = match[0].split("\n")[1]?.match(CONTINUATION)?.[0] ?? "";
  const repaired = splitWithPrefix(replacement, prefix);
  // The file uses CRLF, so the new text keeps that line ending.
  return {
    old_string: match[0],
    new_string: match[0].includes("\r\n")
      ? repaired.replace(/\r?\n/g, "\r\n")
      : repaired,
  };
};

/** The text before a quoted heredoc that makes it the message of `git commit`. */
const COMMIT_BEFORE =
  /(?:^|[\s;&|(])git\s+commit\b[^\n]*\s(?:-m|--message)\s+"\$\(cat\s*$/;
/** The text before a quoted heredoc that makes it the body of `gh pr create`. */
const PR_BEFORE =
  /(?:^|[\s;&|(])gh\s+pr\s+create\b[^\n]*\s(?:-b|--body)\s+"\$\(cat\s*$/;
/** A quoted heredoc operator: `<<'EOF'` followed by the end of its line. */
const HEREDOC = /<<'([A-Za-z_]\w*)'[ \t]*\n/;
/** A trailer line, such as `Co-Authored-By: Name <mail>`. */
const TRAILER = /^[A-Za-z][\w-]*: \S/;

/**
 * The text of a heredoc body after the rewrite.
 * `keepFirst` keeps the first line (the subject of a commit).
 * The last paragraph stays as written when each of its lines is a trailer.
 */
const rewriteBody = (lines: string[], keepFirst: boolean) => {
  const head = keepFirst ? lines.slice(0, 1) : [];
  let tail: string[] = [];
  let middle = lines.slice(head.length);
  const blank = middle.findLastIndex((l) => l.trim() === "");
  const last = middle.slice(blank + 1);
  if (last.length && last.every((l) => TRAILER.test(l))) {
    tail = last;
    middle = middle.slice(0, blank + 1);
  }
  const text = middle.join("\n");
  const out = middle.length ? sembr(text).split("\n") : [];
  return [...head, ...out, ...tail];
};

/**
 * The `command` of a `Bash` call after the rewrite, or undefined when it stays.
 * Only the quoted-heredoc forms change: the message of `git commit -m "$(cat <<'EOF' ...)"`
 * and the body of `gh pr create --body "$(cat <<'EOF' ...)"`.
 * The subject of a commit, the title of a pull request, and the trailers stay as written.
 * The command stays when an output line would equal the delimiter, because the heredoc would end early.
 */
export const rewriteCommand = (command: unknown) => {
  if (typeof command !== "string") return undefined;
  const found = HEREDOC.exec(command);
  if (!found) return undefined;
  const [operator, delimiter = ""] = found;
  const before = command.slice(0, found.index);
  const isCommit = COMMIT_BEFORE.test(before);
  if (!(isCommit || PR_BEFORE.test(before)) || /<</.test(before))
    return undefined;
  const bodyAt = found.index + operator.length;
  const rest = command.slice(bodyAt).split("\n");
  const end = rest.indexOf(delimiter);
  if (end < 0 || /<</.test(rest.slice(end + 1).join("\n"))) return undefined;
  const lines = rest.slice(0, end);
  const out = rewriteBody(lines, isCommit);
  if (out.includes(delimiter) || out.join("\n") === lines.join("\n"))
    return undefined;
  return command.slice(0, bodyAt) + [...out, ...rest.slice(end)].join("\n");
};

/**
 * The `tool.call` input of a `Write` after the rewrite.
 * A path that is not Markdown, and a text that needs no change, give `e` itself.
 */
export const writeInput = (e: WriteCall) => {
  if (!isMarkdown(e.file_path)) return e;
  const content = rewriteContent(e.content);
  return content === undefined ? e : { ...e, content };
};

/**
 * The `tool.call` input of an `Edit` after the repair of `old_string` and the rewrite of `new_string`.
 * `file` is the text of the file, or `null` when it cannot be read.
 * A path that is not Markdown, and an edit that needs no change, give `e` itself.
 */
export const editInput = (e: EditCall, file: string | null) => {
  if (!isMarkdown(e.file_path)) return e;
  const fix = repairEdit(file, e.old_string, e.new_string);
  const repaired = fix ? { ...e, ...fix } : e;
  const next = rewriteEdit(repaired, file);
  return next === undefined ? repaired : { ...repaired, new_string: next };
};

/**
 * The `tool.call` input of a `Bash` call after the rewrite of a quoted heredoc, or `e` itself.
 */
export const commandInput = (e: BashCall) => {
  const command = rewriteCommand(e.command);
  return command === undefined ? e : { ...e, command };
};
