import type { SessionMessage } from "claude-code";

const OPEN_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+\[ \]\s+(.*\S)\s*$/;

/** The syntax of a blocker the user can run: `! <command>`. */
const USER_COMMAND = /(?:^|[\s`(])!\s+\S/;

/** A line that tells the user to run something: a `! <command>` line or span, `sudo`, or a backtick command after "you need to run" with no `! `. */
const COMMAND_LINE =
	/^\s*!\s+\S|`!\s+[^`]+`|\bsudo\s+\S|\byou\s+(?:need to|must|should|have to|can)\s+run\s+`[^`]+`/i;

const HEADING = /^#{1,6}\s+What I Need from You\s*$/m;

interface Turn {
	readonly asking: boolean;
}

/** What a turn holds, from its last human message on: a question not yet answered. A refused call excuses nothing. */
export const turnOf = (messages: readonly SessionMessage[]): Turn => {
	const start = messages.findLastIndex(
		(message) => message.role === "user" && message.text !== "",
	);
	const uses = messages.slice(start + 1).flatMap((message) => message.toolUses);
	return {
		asking: uses.some(
			(use) => use.tool === "AskUserQuestion" && use.text === undefined,
		),
	};
};

/** The task items of `reply` that no pending ask in `turn` excuses and that hold no `! ` command: each is a question typed as a checklist item. */
export const openItems = (reply: string, turn: Turn): readonly string[] =>
	turn.asking
		? []
		: reply.split("\n").flatMap((line) => {
				const item = OPEN_ITEM.exec(line)?.[1];
				return item === undefined || USER_COMMAND.test(item) ? [] : [item];
			});

/** The lines that name a command for the user outside an open item, and whether the items lack the one heading. */
export const commandForm = (
	reply: string,
): { readonly stray: readonly string[]; readonly headless: boolean } => {
	const lines = reply.split("\n");
	const inItem = (line: string): boolean => {
		const item = OPEN_ITEM.exec(line)?.[1];
		return item !== undefined && USER_COMMAND.test(item);
	};
	return {
		stray: lines
			.filter((line) => COMMAND_LINE.test(line) && !inItem(line))
			.map((line) => line.trim()),
		headless: lines.some(inItem) && !HEADING.test(reply),
	};
};
