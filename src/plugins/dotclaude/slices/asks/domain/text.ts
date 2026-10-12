// The text that a `Write`, `Edit`, or `MultiEdit` call adds to a file, as pure functions.
// `read(file)` gives the text of a file, or null when the file is absent or too large.

import { resolve } from "./paths.ts";

/** The fields of a hook payload that the checks read. */
export type Payload = {
  cwd?: string;
  tool_name?: string;
  tool_input?: ToolInput | undefined;
};

/** The fields of the `tool_input` of a call that the checks read. */
export type ToolInput = {
  command?: string;
  file_path?: unknown;
  content?: unknown;
  old_string?: unknown;
  new_string?: unknown;
  edits?: Edit[];
};

/** One edit of a `MultiEdit` call, or the edit of an `Edit` call. */
type Edit = {
  old_string?: unknown;
  new_string?: unknown;
  replace_all?: boolean;
};

/** The text of a file, or null when the file is absent or not read. */
export type Reader = (file: string) => Promise<string | null>;

/** The effect of a file call, as `change` gives it. */
export type Change = {
  file: string;
  before: string | null;
  after: string | null;
  fragment: string;
};

/** The tools that write a file. */
export const FILE_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);

/**
 * The effect of a file call: `{ file, before, after, fragment }`.
 * `file` is the absolute path, `before` the text of the file now (null when absent),
 * and `after` the text of the file after the call (null when the call does not apply to `before`).
 * `fragment` is the text that the call writes, and the checks use it when `after` is null.
 */
export const change = async (
  payload: Payload,
  read: Reader,
): Promise<Change> => {
  const input: ToolInput = payload.tool_input ?? {};
  const file = resolve(payload.cwd ?? "", String(input.file_path ?? ""));
  const before = await read(file);
  if (payload.tool_name === "Write") {
    const text = String(input.content ?? "");
    return { file, before, after: text, fragment: text };
  }
  const edits: Edit[] =
    payload.tool_name === "MultiEdit"
      ? (input.edits ?? [])
      : [{ old_string: input.old_string, new_string: input.new_string }];
  const fragment = edits.map((e) => String(e?.new_string ?? "")).join("\n");
  let after = before ?? "";
  for (const e of edits) {
    const old = String(e?.old_string ?? "");
    const next = String(e?.new_string ?? "");
    if (old === "" ? before !== null && before !== "" : !after.includes(old))
      return { file, before, after: null, fragment };
    if (old === "") after = next;
    else if (e.replace_all) after = after.split(old).join(next);
    else after = after.replace(old, () => next);
  }
  return { file, before, after, fragment };
};

/**
 * The strings that `find` returns for the text after a call and not for the text before it.
 * A string that the file already holds does not count, so an old defect never blocks a new edit.
 * Without `after`, the strings of the fragment count.
 */
export const added = (
  find: (text: string) => string[],
  { before, after, fragment }: Change,
): string[] => {
  if (after === null) return find(fragment);
  const old = new Map<string, number>();
  for (const item of find(before ?? ""))
    old.set(item, (old.get(item) ?? 0) + 1);
  return find(after).filter((item) => {
    const n = old.get(item) ?? 0;
    if (n) old.set(item, n - 1);
    return n === 0;
  });
};

/** The lines of `before` that `after` does not keep, each in order. A line is kept when `after` holds it in the same order. */
export const lostLines = (before: string, after: string): string[] => {
  const next = after.split("\n");
  const lost: string[] = [];
  let at = 0;
  for (const line of before.split("\n")) {
    let j = at;
    while (j < next.length && next[j] !== line) j++;
    if (j < next.length) at = j + 1;
    else lost.push(line);
  }
  return lost;
};
