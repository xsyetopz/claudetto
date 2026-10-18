// The mod handler of the `ground` slice: `tool.call` on `Write` and `Edit` of a plan or a spec file, and on `ProposeGoal`.
// A claim with no source gets a deny that names it, and the three ways out (`prompts/unsourced.md`).
// The hook has no catch-all: when it throws, Claude Code logs the failure and skips the hook, so the call runs.
// The session and the files are read here, because `claude plugin validate` follows `$` only into a function of one file.

import type { EngineInterface, MatchedHook } from "claude-code";
import { planText } from "../domain/plan.ts";
import { groundDeny } from "./shared.ts";

export type GroundHook = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["Write", "Edit", "ProposeGoal"] }
>;

/** The text of `path` or `null`. */
const readOf = async ($: EngineInterface, path: string) =>
  (await $.fs.exists(path)) ? await $.fs.read(path) : null;

export const onPlanCall: GroundHook = async ($, e, next) => {
  const text = planText(e as Parameters<typeof planText>[0]);
  if (text === null) return next(e);
  const msgs = (await $.session.messages()).map((m) => ({
    role: m.role,
    text: m.text,
    results: (m.toolResults ?? []).map((r) => r.text),
    bash: m.toolUses.filter((u) => u.tool === "Bash").length,
  }));
  const deny = await groundDeny(
    text,
    msgs,
    {
      read: (path) => readOf($, path),
      list: (dir) => $.fs.list(dir),
    },
    await $.session.cwd(),
    "file_path" in e
      ? { path: e.file_path, old: "old_string" in e ? e.old_string : "" }
      : null,
  );
  return deny === null ? next(e) : { deny };
};
