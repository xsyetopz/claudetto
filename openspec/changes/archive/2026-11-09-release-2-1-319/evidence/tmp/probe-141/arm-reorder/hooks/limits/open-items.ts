import type { SessionMessage } from "claude-code";

const OPEN_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+\[ \]\s+(.*\S)\s*$/;

/** The syntax of a blocker the user can run: `! <command>`. */
const USER_COMMAND = /(?:^|[\s`(])!\s+\S/;

interface Turn {
	readonly denied: boolean;
	readonly asking: boolean;
}

/** What a turn holds, from its last human message on: a tool call the engine refused, and a question not yet answered. */
export const turnOf = (messages: readonly SessionMessage[]): Turn => {
	const start = messages.findLastIndex(
		(message) => message.role === "user" && message.text !== "",
	);
	const uses = messages.slice(start + 1).flatMap((message) => message.toolUses);
	return {
		denied: uses.some((use) => use.isError === true),
		asking: uses.some(
			(use) => use.tool === "AskUserQuestion" && use.text === undefined,
		),
	};
};

interface OpenItems {
	readonly items: readonly string[];
	readonly offer: string | undefined;
}

/** The task items and the closing question of `reply` that no blocker `turn` holds excuses. */
export const openItems = (reply: string, turn: Turn): OpenItems => {
	const lines = reply.split("\n");
	const last = lines.findLast((line) => line.trim() !== "")?.trim();
	const open = turn.denied || turn.asking;
	return {
		items: open
			? []
			: lines.flatMap((line) => {
					const item = OPEN_ITEM.exec(line)?.[1];
					return item === undefined || USER_COMMAND.test(item) ? [] : [item];
				}),
		offer: open || last?.endsWith("?") !== true ? undefined : last,
	};
};
