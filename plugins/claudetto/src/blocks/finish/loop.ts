import type { SessionMessage, ToolUseSummary } from "claude-code";

/** The most stops in a row that the loop blocks with no progress between them. */
export const LOOP_BLOCKS_MAX = 5;

const APPLY_SKILL = "openspec-apply-change";
const APPLY_TYPED = `<command-name>/${APPLY_SKILL}</command-name>`;
const EDIT_TOOLS = new Set(["Edit", "Write", "NotebookEdit"]);
const OPEN_BOX = /^- \[ \] (\S+)\s+(.*)$/;
const BLOCKED_MARK = "blocked:";

/** The count of blocks in a row and the progress mark they saw. */
export interface LoopHeld {
	readonly count: number;
	readonly seen: string;
}

/** Whether a stored value has the shape of `LoopHeld`, since the store returns what an older build wrote. */
export const isHeld = (value: unknown): value is LoopHeld =>
	typeof value === "object" &&
	value !== null &&
	"count" in value &&
	typeof value.count === "number" &&
	"seen" in value &&
	typeof value.seen === "string";

/** The first open box of a `tasks.md` text that is not marked `blocked:`: its id and its text. */
export const nextOpen = (
	text: string,
): { id: string; task: string } | undefined => {
	for (const line of text.split("\n")) {
		const open = OPEN_BOX.exec(line);
		if (
			open?.[1] !== undefined &&
			open[2] !== undefined &&
			!open[2].includes(BLOCKED_MARK)
		) {
			return { id: open[1], task: open[2] };
		}
	}
	return undefined;
};

const isApply = (message: SessionMessage): boolean =>
	(message.role === "user" && message.text.includes(APPLY_TYPED)) ||
	message.toolUses.some(
		(use) =>
			use.tool === "Skill" &&
			!use.isError &&
			use.input["skill"] === APPLY_SKILL,
	);

const edits = (messages: readonly SessionMessage[]): ToolUseSummary[] =>
	messages
		.flatMap((message) => message.toolUses)
		.filter((use) => EDIT_TOOLS.has(use.tool) && !use.isError);

const pathOf = (use: ToolUseSummary): string | undefined => {
	const path = use.input["file_path"] ?? use.input["notebook_path"];
	return typeof path === "string" ? path : undefined;
};

/** The `tasks.md` files that the session edited after its last apply of an OpenSpec change. */
export const appliedTasks = (messages: readonly SessionMessage[]): string[] => {
	const from = messages.findLastIndex(isApply);
	if (from === -1) {
		return [];
	}
	const paths = edits(messages.slice(from + 1)).map(pathOf);
	return [
		...new Set(
			paths.filter(
				(path): path is string => path?.endsWith("/tasks.md") === true,
			),
		),
	];
};

/** A mark that moves with each file edit of the session and with the next open box. */
export const progressOf = (
	messages: readonly SessionMessage[],
	openId: string,
): string => `${edits(messages).length} ${openId}`;

/** Blocks the stop unless `LOOP_BLOCKS_MAX` blocks in a row saw the same mark. */
export const loopStep = (
	held: LoopHeld | undefined,
	seen: string,
): { block: boolean; held: LoopHeld } => {
	const count = held?.seen === seen ? held.count + 1 : 1;
	return count > LOOP_BLOCKS_MAX
		? { block: false, held: { count: 0, seen: "" } }
		: { block: true, held: { count, seen } };
};
