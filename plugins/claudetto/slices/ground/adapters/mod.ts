// The mod handler of the `ground` slice: `tool.call` on `Write` and `Edit` of a plan or a spec file.
// A claim with no source gets a deny that names it, and the three ways out (`prompts.ts`).
// The hook has no catch-all: when it throws, Claude Code logs the failure and skips the hook, so the call runs.
// A tool result that is a deny of this check is no source, because it names each claim and a retry would pass on it.

import type { EngineInterface, MatchedHook } from "claude-code";
import {
  type Files,
  findUnsourced,
  PROJECT_FILES,
  refFiles,
} from "../domain/claims.ts";
import { planText } from "../domain/plan.ts";
import { UNSOURCED } from "../prompts.ts";

export type GroundHook = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["Write", "Edit"] }
>;

const HEAD = UNSOURCED({ claims: "" }).split("\n")[0] as string;
const DIRS_MAX = 2000;

const readOf = async ($: EngineInterface, path: string) =>
  (await $.fs.exists(path)) ? await $.fs.read(path) : null;

/** The text of the first file under `cwd` whose path ends with `file`, with `node_modules` and the dot folders skipped. */
const find = async ($: EngineInterface, cwd: string, file: string) => {
  const queue = [cwd];
  for (let seen = 0; queue.length > 0 && seen < DIRS_MAX; seen++) {
    const dir = queue.shift() as string;
    for (const { name, kind } of await $.fs.list(dir).catch(() => [])) {
      if (kind === "dir" && name !== "node_modules" && !name.startsWith("."))
        queue.push(`${dir}/${name}`);
      if (kind === "file" && `${dir}/${name}`.endsWith(`/${file}`))
        return readOf($, `${dir}/${name}`);
    }
  }
  return null;
};

export const onPlanCall: GroundHook = async ($, e, next) => {
  const text = planText(e as Parameters<typeof planText>[0]);
  if (text === null) return next(e);
  const cwd = await $.session.cwd();
  const msgs = (await $.session.messages()).map((m) => ({
    role: m.role,
    text: m.text,
    results: (m.toolResults ?? [])
      .map((r) => r.text)
      .filter((r) => !r.includes(HEAD)),
    bash: m.toolUses.filter((u) => u.tool === "Bash").length,
  }));
  const entries = await Promise.all([
    ...PROJECT_FILES.map(
      async (n) => [n, await readOf($, `${cwd}/${n}`)] as const,
    ),
    ...refFiles(text).map(
      async (n) =>
        [
          n,
          (await readOf($, `${cwd}/${n}`)) ?? (await find($, cwd, n)),
        ] as const,
    ),
  ]);
  const own =
    "file_path" in e
      ? `${(await readOf($, e.file_path)) ?? ""}\n${"old_string" in e ? e.old_string : ""}`
      : "";
  const claims = findUnsourced(
    text,
    msgs,
    Object.fromEntries(entries) as Files,
    own,
  );
  return claims.length === 0
    ? next(e)
    : { deny: UNSOURCED({ claims: claims.map((c) => `- ${c}`).join("\n") }) };
};
