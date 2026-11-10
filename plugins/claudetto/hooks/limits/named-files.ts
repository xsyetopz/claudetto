import { type Command, parse } from "../gate/shell-words.ts";

const FENCE = /^\s*```/u;
const SPAN = /`([^`\n]*)`/gu;
const USER_COMMAND = /^!\s+(\S.*)$/u;

/** Commands that make their operands, all of them or the last one, so a missing path there is no fault. */
const MAKES_ALL = new Set(["mkdir", "touch"]);
const MAKES_LAST = new Set(["cp", "mv"]);

/** The `<command>` of each `! <command>` step in an inline code span or a fenced block of `reply`. */
export const userCommands = (reply: string): string[] => {
	let fenced = false;
	return reply.split("\n").flatMap((line) => {
		if (FENCE.test(line)) {
			fenced = !fenced;
			return [];
		}
		const texts = fenced
			? [line]
			: [...line.matchAll(SPAN)].map((span) => span[1] ?? "");
		return texts.flatMap((text) => USER_COMMAND.exec(text.trim())?.[1] ?? []);
	});
};

/** The operands of `command` that it reads, so not a flag, a made path, or a clone destination. */
const readOperands = ({ words }: Command): string[] => {
	const [program = "", ...rest] = words;
	const args = rest.filter((word) => !word.startsWith("-"));
	if (MAKES_ALL.has(program)) {
		return [];
	}
	if (MAKES_LAST.has(program) || (program === "git" && args[0] === "clone")) {
		return args.slice(0, -1);
	}
	return args;
};

const isNamedPath = (word: string): boolean =>
	word.startsWith("/") || word.startsWith("~/");

/** Each `{ path, command }` of a `! <command>` step in `reply` that names an absolute or `~/` path it reads. A relative path is left alone: its cwd is unknown. */
export const namedPaths = (
	reply: string,
): { path: string; command: string }[] =>
	userCommands(reply).flatMap((command) =>
		parse(command)
			.commands.flatMap(readOperands)
			.filter((item) => isNamedPath(item))
			.map((path) => ({ path, command })),
	);
