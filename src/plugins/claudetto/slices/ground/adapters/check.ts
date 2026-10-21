// `check(event, prior)` for the `replay` script of `claudetto-sessions`: the same source check on a recorded call, with no engine.
// `event` is a `PreToolUse` event, and `prior` holds the transcript rows before the call.
// The files are read from the disk as it is now, so a reference to a file that is gone passes.

import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Msg } from "../domain/claims.ts";
import { type PlanCall, planText } from "../domain/plan.ts";
import { groundDeny } from "./shared.ts";

interface Block {
  type?: string;
  text?: string;
  name?: string;
  content?: unknown;
}
interface Row {
  type?: string;
  message?: { content?: Block[] | string };
}

/** The text of a tool result, which is a string or a list of text blocks. */
const resultText = (content: unknown): string =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((b: Block) => b.text ?? "").join("\n")
      : "";

const msgOf = (row: Row): Msg | null => {
  if (row.type !== "user" && row.type !== "assistant") return null;
  const c = row.message?.content;
  const blocks: Block[] =
    typeof c === "string" ? [{ type: "text", text: c }] : (c ?? []);
  return {
    role: row.type,
    text: blocks
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n"),
    results: blocks
      .filter((b) => b.type === "tool_result")
      .map((b) => resultText(b.content)),
    bash: blocks.filter((b) => b.type === "tool_use" && b.name === "Bash")
      .length,
  };
};

/** True when the filter of the hook takes the call: a write of a plan or a spec file. */
export const checked = (event: {
  tool_name: string;
  tool_input?: Omit<PlanCall, "tool">;
}): boolean =>
  planText({ tool: event.tool_name, ...(event.tool_input ?? {}) }) !== null;

export const check = async (
  event: {
    tool_name: string;
    tool_input: Omit<PlanCall, "tool"> & { old_string?: string };
    cwd?: string;
  },
  prior: Row[],
): Promise<{ decision: "block"; reason: string } | undefined> => {
  const input = event.tool_input ?? {};
  const text = planText({ tool: event.tool_name, ...input });
  if (text === null) return undefined;
  const cwd = path.resolve(event.cwd ?? ".");
  const reason = await groundDeny(
    text,
    prior.map(msgOf).filter((m): m is Msg => m !== null),
    {
      read: (file) =>
        Bun.file(path.resolve(cwd, file))
          .text()
          .catch(() => null),
      list: async (dir) =>
        (await readdir(dir, { withFileTypes: true })).map((d) => ({
          name: d.name,
          kind: d.isDirectory() ? "dir" : d.isFile() ? "file" : "other",
        })),
    },
    cwd,
    input.file_path ? { path: input.file_path, old: input.old_string } : null,
  );
  return reason === null ? undefined : { decision: "block", reason };
};
