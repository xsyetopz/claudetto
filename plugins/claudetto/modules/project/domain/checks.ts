// The check commands that passed in a session, and whether a passed check supports a task.
// The checks that passed in the session (task 3.12, D48): the done list of a handoff holds no claim of the model.
// Only a plain `just` recipe or `bun test` command counts, so a `||`, a `;`, or a pipe cannot hide a failure.

import type { SessionMessage } from "claude-code";
import { taskEntries } from "./change.ts";

const CHECK =
	/^(?:just (?:docker )?(?:check|test|lab|lint|validate)|bun test)(?: [^;&|<>$`\n]*)?$/;

export const isCheck = (command: string): boolean => CHECK.test(command.trim());

/** The `Bash` check commands with a result and no `isError`, each once, in the order of the last run. A background command has no outcome. */
export const passedChecks = (messages: readonly SessionMessage[]): string[] => {
	const outcome = new Map<string, boolean>();
	for (const use of messages.flatMap((m) => m.toolUses)) {
		const input: unknown = use.input;
		const command =
			typeof input === "object" && input !== null && "command" in input
				? input.command
				: undefined;
		const background =
			typeof input === "object" &&
			input !== null &&
			"run_in_background" in input &&
			input.run_in_background === true;
		if (use.tool !== "Bash" || typeof command !== "string") {
			continue;
		}
		const trimmed = command.trim();
		if (background || !isCheck(trimmed)) {
			continue;
		}
		if (use.text !== undefined) {
			outcome.set(trimmed, use.isError !== true);
		}
	}
	return [...outcome].filter(([, isPassed]) => isPassed).map(([c]) => c);
};

/** The task lines of a `tasks.md` by id, each with whether its box is checked. */
export const taskLines = (text: string) => {
	const lines = new Map<string, { on: boolean; line: string }>();
	for (const { id, done, line } of taskEntries(text)) {
		lines.set(id, { on: done, line });
	}
	return lines;
};

/** A line that names check commands needs one of them to have passed. A line that names none needs any passed check. */
export const proven = (line: string, passed: readonly string[]): boolean => {
	const named = [...line.matchAll(/`([^`]+)`/g)]
		.map((m) => (m[1] ?? "").trim())
		.filter(isCheck);
	return named.length === 0
		? passed.length > 0
		: named.some((n) => passed.some((p) => p === n || p.startsWith(`${n} `)));
};
