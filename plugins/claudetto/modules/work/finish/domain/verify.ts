// The check before a stop: a turn that edits a file that is not Markdown needs a passed check after its last edit.
// Only a project with a check that `isCheck` accepts gets the rule, so a project with other test runners gets no block.

import type { SessionMessage } from "claude-code";
import { isCheck, passedChecks } from "../../../project/index.ts";

const RECIPE = /^(check|test|lab|lint|validate)(?=[\s:])[^:=\n]*:(?!=)/gm;

/** The check commands of a project: each `justfile` recipe that `isCheck` accepts, and `bun test` when the project has a `bun.lock`. */
export const projectChecks = (
  justfile: string | undefined,
  bunLock: boolean,
): string[] => [
  ...[...(justfile ?? "").matchAll(RECIPE)]
    .map((m) => `just ${m[1]}`)
    .filter(isCheck),
  ...(bunLock ? ["bun test"] : []),
];

/** Whether `rows` edit a file that is not Markdown and run no passed check after the last such edit. */
export const uncheckedEdit = (rows: readonly SessionMessage[]): boolean => {
  const uses = rows.flatMap((m) => m.toolUses);
  const last = uses.findLastIndex((u) => {
    const file = (u.input as { file_path?: unknown } | undefined)?.file_path;
    return (
      (u.tool === "Edit" || u.tool === "Write") &&
      typeof file === "string" &&
      !/\.mdx?$/i.test(file)
    );
  });
  if (last < 0) return false;
  const after = { role: "assistant", text: "", toolUses: uses.slice(last + 1) };
  return passedChecks([after as SessionMessage]).length === 0;
};
