// The text that a `Write`, `Edit`, or `MultiEdit` call adds to a file, as pure functions.
// `read(file)` gives the text of a file, or null when the file is absent or too large.

import path from "node:path";

/** The tools that write a file. */
export const FILE_TOOLS = new Set(["Write", "Edit", "MultiEdit"]);

/**
 * The effect of a file call: `{ file, before, after, fragment }`.
 * `file` is the absolute path, `before` the text of the file now (null when absent),
 * and `after` the text of the file after the call (null when the call does not apply to `before`).
 * `fragment` is the text that the call writes, and the checks use it when `after` is null.
 */
export function change(payload, read) {
  const input = payload.tool_input ?? {};
  const file = path.resolve(payload.cwd ?? "", String(input.file_path ?? ""));
  const before = read(file);
  if (payload.tool_name === "Write") {
    const text = String(input.content ?? "");
    return { file, before, after: text, fragment: text };
  }
  const edits =
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
}

/**
 * The strings that `find` returns for the text after a call and not for the text before it.
 * A string that the file already holds does not count, so an old defect never blocks a new edit.
 * Without `after`, the strings of the fragment count.
 */
export function added(find, { before, after, fragment }) {
  if (after === null) return find(fragment);
  const old = new Map();
  for (const item of find(before ?? ""))
    old.set(item, (old.get(item) ?? 0) + 1);
  return find(after).filter((item) => {
    const n = old.get(item) ?? 0;
    if (n) old.set(item, n - 1);
    return n === 0;
  });
}

/** The lines of `before` that `after` does not keep, each in order. A line is kept when `after` holds it in the same order. */
export function lostLines(before, after) {
  const next = after.split("\n");
  const lost = [];
  let at = 0;
  for (const line of before.split("\n")) {
    let j = at;
    while (j < next.length && next[j] !== line) j++;
    if (j < next.length) at = j + 1;
    else lost.push(line);
  }
  return lost;
}
