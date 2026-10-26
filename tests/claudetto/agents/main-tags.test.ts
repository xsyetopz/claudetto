// Spec `prompt-base`, scenario "Section Tags": each XML tag of `agents/main.md` is the name of a section of Claude Code 2.1.310, or `security`.

import { expect, test } from "bun:test";
import path from "node:path";
import { PLUGINS } from "../../support/repo.ts";

/** The 36 section names of Claude Code 2.1.310, from `just builtins`. */
const SECTIONS = [
  "act_dont_rederive",
  "action_caution",
  "actions",
  "autonomy_append",
  "bg-session",
  "brief",
  "brook_heron",
  "communication",
  "context_management",
  "delivering_work_max",
  "doing_tasks",
  "endconv_deferred_hint",
  "env_info_simple",
  "env_info_static",
  "fable_identity",
  "focus_mode",
  "heron_brook",
  "intro",
  "lean_body",
  "memory",
  "memory_static",
  "overcorrection",
  "pronouns",
  "repl_working",
  "session_guidance",
  "subagent_steer_delegation",
  "surface",
  "system",
  "system_messages",
  "task_continuity",
  "tone",
  "tool_param_json",
  "tools",
  "total_tokens",
  "user_pays",
  "willow_tern",
];

/** The tags that stand alone on a line, in order: the opening tags and the closing tags. */
const tags = async (): Promise<{ open: string[]; close: string[] }> => {
  const text = await Bun.file(
    path.join(PLUGINS, "claudetto", "agents", "main.md"),
  ).text();
  const found = (re: RegExp): string[] =>
    [...text.matchAll(re)].map((m) => m[1] as string);
  return {
    open: found(/^<([A-Za-z_-]+)>$/gm),
    close: found(/^<\/([A-Za-z_-]+)>$/gm),
  };
};

test("Section Tags: each tag of `main.md` is a section name of 2.1.310 or `security`", async () => {
  const { open, close } = await tags();
  expect(open.length).toBeGreaterThan(0);
  expect(open.filter((t) => ![...SECTIONS, "security"].includes(t))).toEqual(
    [],
  );
  expect(close).toEqual(open);
  expect(new Set(open).size).toBe(open.length);
});
