// The mod handler of the `ground` slice: `tool.call` on `Write` and `Edit` of a plan or a spec file, and on `ProposeGoal`.
// A claim with no source gets a deny that names it, and the three ways out (`prompts/unsourced.md`).
// The hook has no catch-all: when it throws, Claude Code logs the failure and skips the hook, so the call runs.
// The session and the files are read here, because `claude plugin validate` follows `$` only into a function of one file.

import type { EngineInterface, MatchedHook } from "claude-code";
import {
  type Files,
  findUnsourced,
  type Msg,
  neededFiles,
} from "../domain/claims.ts";
import { planText } from "../domain/plan.ts";
import { UNSOURCED } from "../prompts.ts";

export type GroundHook = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["Write", "Edit", "ProposeGoal"] }
>;

/** The text of `path` or `null`, with a relative path from `cwd`. */
const readOf = async ($: EngineInterface, cwd: string, path: string) => {
  const full = path.startsWith("/") ? path : `${cwd}/${path}`;
  return (await $.fs.exists(full)) ? await $.fs.read(full) : null;
};

export const onPlanCall: GroundHook = async ($, e, next) => {
  const text = planText(e as Parameters<typeof planText>[0]);
  if (text === null) return next(e);
  const cwd = await $.session.cwd();
  const names = neededFiles(text);
  const files: Files = Object.fromEntries(
    await Promise.all(
      names.map(async (n) => [n, await readOf($, cwd, n)] as const),
    ),
  );
  const target = "file_path" in e ? await readOf($, cwd, e.file_path) : null;
  const msgs: Msg[] = (await $.session.messages()).map((m) => ({
    role: m.role,
    text: m.text,
    results: [
      ...(m.toolResults ?? []).map((r) => r.text),
      ...m.toolUses.map((u) => u.text ?? ""),
    ],
    bash: m.toolUses.filter((u) => u.tool === "Bash").length,
  }));
  const claims = findUnsourced(text, msgs, files, target ?? "");
  return claims.length > 0
    ? { deny: UNSOURCED({ claims: claims.map((c) => `- ${c}`).join("\n") }) }
    : next(e);
};
