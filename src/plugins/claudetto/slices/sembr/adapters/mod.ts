// The mod handler of the `sembr` slice: the `tool.call` rewrites on `Write`, `Edit`, and `Bash` (design D29).
// Claude Code checks `old_string` before a classic hook runs, so only a module can repair it (probe 2.29).
// The file is read here, because `claude plugin validate` follows `$` only into a function of one file.

import type { MatchedHook } from "claude-code";
import { commandInput, editInput, writeInput } from "../domain/rewrite.ts";

export type SembrHook = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["Write", "Edit", "Bash"] }
>;

export const onToolCall: SembrHook = async ($, e, next) => {
  if (e.tool === "Write") return next(writeInput(e));
  if (e.tool === "Bash") return next(commandInput(e));
  if (e.tool !== "Edit") return next(e);
  const file = (await $.fs.exists(e.file_path))
    ? await $.fs.read(e.file_path)
    : null;
  return next(editInput(e, file));
};
