// The checks that passed in the session (task 3.12, D48): the done list of a handoff holds no claim of the model.
// A check passed when its `Bash` tool use has a result and no `isError`, which Claude Code sets for a command with a non-zero exit.
// A command in the background has no outcome, so it does not count.
// Only a plain `just` recipe or `bun test` command counts, so a `||`, a `;`, or a pipe cannot hide a failure.
// The functions are pure.

import type { SessionMessage } from "claude-code";

/** A check command: `just check`, `just test F`, `just lab`, `just lint`, `just validate`, the same with `docker` after `just`, or `bun test F`, with no shell operator. */
const CHECK =
  /^(?:just (?:docker )?(?:check|test|lab|lint|validate)|bun test)(?: [^;&|<>$`\n]*)?$/;

export const passedChecks = (messages: readonly SessionMessage[]): string[] => {
  const outcome = new Map<string, boolean>();
  for (const use of messages.flatMap((m) => m.toolUses)) {
    const input = use.input as
      | { command?: unknown; run_in_background?: unknown }
      | undefined;
    const command = input?.command;
    if (use.tool !== "Bash" || typeof command !== "string") continue;
    const trimmed = command.trim();
    if (input?.run_in_background === true || !CHECK.test(trimmed)) continue;
    if (use.text !== undefined) outcome.set(trimmed, use.isError !== true);
  }
  return [...outcome].filter(([, isPassed]) => isPassed).map(([c]) => c);
};
