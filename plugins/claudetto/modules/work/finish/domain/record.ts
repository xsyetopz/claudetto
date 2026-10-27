// What the record of the session says about the work of the session.

import type { AgentInfo, SessionMessage } from "claude-code";
import { proven } from "../../../project/domain/checks.ts";
import { runningAgents } from "../../../project/domain/session.ts";
import { ticked } from "./tasks.ts";

interface Input {
	file_path?: unknown;
	old_string?: unknown;
	new_string?: unknown;
}

/** The inputs of the successful calls of `tools` in `messages`. */
const inputs = (messages: readonly SessionMessage[], ...tools: string[]) =>
	messages
		.flatMap((m) => m.toolUses)
		.filter((u) => tools.includes(u.tool) && !u.isError)
		.map((u): Input => u.input ?? {});

/** The boxes that each successful `Edit` of a `tasks.md` in `messages` ticked, with the path of the file. */
const tickEdits = (messages: readonly SessionMessage[]) =>
	inputs(messages, "Edit").flatMap((i) =>
		typeof i.file_path === "string" && i.file_path.endsWith("tasks.md")
			? [
					{
						file: i.file_path,
						boxes: ticked(String(i.old_string), String(i.new_string)),
					},
				]
			: [],
	);

/** The ids of the boxes that an `Edit` of a `tasks.md` ticked and that no passed check in `passed` supports. The `box` hook denies such an edit, so a box here came through another way, such as a shell command. */
export const unprovenTicks = (
	messages: readonly SessionMessage[],
	passed: readonly string[],
): string[] =>
	tickEdits(messages)
		.flatMap((t) => t.boxes)
		.filter(({ line }) => !proven(line, passed))
		.map(({ id }) => id);

/** The rows of the current turn: those after the last user row that holds text. A row with only tool results has no text. */
export const turnRows = (
	messages: readonly SessionMessage[],
): readonly SessionMessage[] => {
	const last = messages.findLastIndex(
		(m) => m.role === "user" && m.text.trim() !== "",
	);
	return messages.slice(last + 1);
};

const APPLY_COMMAND = "<command-name>/claudetto:apply</command-name>";

/** Whether `messages` show a run of `/claudetto:apply`: a user row with its command tag, or a `Skill` call of `claudetto:apply`. */
export const ranApply = (messages: readonly SessionMessage[]): boolean =>
	messages.some(
		(m) =>
			(m.role === "user" && m.text.includes(APPLY_COMMAND)) ||
			m.toolUses.some((u) => {
				const { skill } = u.input ?? {};
				return u.tool === "Skill" && !u.isError && skill === "claudetto:apply";
			}),
	);

/** Whether an agent of `agents` has work in flight: `pending`, `running`, or `waiting`. */
export const agentBusy = (agents: readonly AgentInfo[]): boolean =>
	runningAgents(agents).length > 0;

/** The paths of the `tasks.md` files that an `Edit` in `rows` ticked a box of. */
export const tickedFiles = (rows: readonly SessionMessage[]): string[] => [
	...new Set(
		tickEdits(rows).flatMap((t) => (t.boxes.length > 0 ? [t.file] : [])),
	),
];
