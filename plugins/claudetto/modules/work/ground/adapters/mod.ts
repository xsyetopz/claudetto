// The mod handler of the `ground` slice: `tool.call` on `Write` and `Edit` of a plan or a spec file.
// A claim with no source gets a deny that names it and the three ways out (`prompts.ts`).
// The hook has no catch-all: when it throws, Claude Code skips the hook, so the call runs.
// A tool result that is a deny of this check is no source, because a retry would pass on it.
// The sources are the messages of the caller (its own transcript for a subagent). An `AskUserQuestion` answer and the handoff text count as user messages.

import type { EngineInterface, MatchedHook } from "claude-code";
import { HANDOVER_RESUME } from "../../../session/index.ts";
import {
  type Files,
  findUnsourced,
  PROJECT_FILES,
  RULES_DIR,
  refFiles,
} from "../domain/claims.ts";
import { inScenario, planText } from "../domain/plan.ts";
import { UNSOURCED } from "../prompts.ts";

const HEAD = UNSOURCED({ claims: "" }).split("\n")[0] as string;
const DIRS_MAX = 2000;
/** The start of `HANDOVER_RESUME`, the text that opens the first message after a handover. */
const HANDOFF_HEAD = HANDOVER_RESUME({ path: "" }).split(", from")[0] as string;

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

type GroundHook = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["Write", "Edit"] }
>;

export const onPlanCall: GroundHook = async ($, e, next) => {
  const text = planText(e as Parameters<typeof planText>[0]);
  if (text === null) return next(e);
  const cwd = await $.session.cwd();
  const found =
    e.agentId === undefined
      ? await $.session.messages()
      : await $.session.messages({ agentId: e.agentId });
  // A subagent that the session cannot read has no sources to check against, so the call runs.
  if (!Array.isArray(found)) return next(e);
  const msgs = found.map((m) => ({
    role: m.text.includes(HANDOFF_HEAD) ? ("user" as const) : m.role,
    text: m.text,
    // The text of a tool use is its result as the model read it, and a subagent transcript may hold no `toolResults`.
    results: [
      ...(m.toolResults ?? []).map((r) => r.text),
      ...m.toolUses.map((u) => u.text ?? ""),
    ].filter((r) => !r.includes(HEAD)),
    bash: m.toolUses.filter((u) => u.tool === "Bash").length,
    answers: m.toolUses
      .filter((u) => u.tool === "AskUserQuestion" && !u.isError)
      .map((u) => u.text ?? ""),
  }));
  const rules = (await $.fs.list(`${cwd}/${RULES_DIR}`).catch(() => []))
    .filter(({ name, kind }) => kind === "file" && name.endsWith(".md"))
    .map(({ name }) => `${RULES_DIR}/${name}`);
  const entries = await Promise.all([
    ...[...PROJECT_FILES, ...rules].map(
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
  const target = "file_path" in e ? await readOf($, e.file_path) : null;
  // An edit inside a scenario block of a spec file is an example value.
  if (
    "old_string" in e &&
    inScenario(target ?? "", e.old_string) &&
    /(?:^|\/)spec\.md$/.test(e.file_path)
  )
    return next(e);
  const own = `${target ?? ""}\n${"old_string" in e ? e.old_string : ""}`;
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
