import type { On } from "claude-code";
import { printsFile } from "./rules.ts";
import { type Command, parse, programOf } from "./shell-words.ts";
import { fieldOf } from "./verdict.ts";

export interface Split {
	/** The command line without its closing `cat`. */
	rest: string;
	/** The file the closing `cat` printed, as written. */
	file: string;
}

const SEPARATORS = /;|&&|\n/g;

const catOf = (c: Command): string | undefined => {
	const { name, args } = programOf(c);
	const plain = !(c.from || c.into) && c.redirects.length === 0;
	return plain &&
		c.dynamic.length === 0 &&
		name === "cat" &&
		args.length === 1 &&
		printsFile(name, args) &&
		!args[0]?.startsWith("-") &&
		!args[0]?.startsWith("~")
		? args[0]
		: undefined;
};

/** A line that ends in `; cat <file>` (or `&&`, or a newline) splits into the rest and the file; the parser must read both halves, and the halves must hold as many commands as the whole. */
export const splitRead = (command: string): Split | undefined => {
	const whole = parse(command);
	if (whole.unreadable) {
		return undefined;
	}
	for (const m of [...command.matchAll(SEPARATORS)].reverse()) {
		const rest = command.slice(0, m.index).trim();
		const tail = parse(command.slice(m.index + m[0].length));
		const head = parse(rest);
		const [only] = tail.commands;
		const file = tail.commands.length === 1 && only ? catOf(only) : undefined;
		if (
			file !== undefined &&
			!tail.unreadable &&
			!head.unreadable &&
			head.commands.length > 0 &&
			head.commands.length + 1 === whole.commands.length
		) {
			return { rest, file };
		}
	}
	return undefined;
};

/** The text goes into the result, as a `cat` would print it: a reply that quotes it then quotes tool output the user can see in the transcript, which the Stop grader accepts; text in `context` it flags. A failed run arrives as a string, which the engine accepts changed only in the object shape. */
const withRead = (result: unknown, text: string): unknown =>
	typeof result === "object" && result !== null
		? {
				...result,
				stdout: `${"stdout" in result ? result.stdout : ""}\n${text}`,
			}
		: { stdout: `${result}\n${text}`, stderr: "", interrupted: false };

/** The gate refuses a shell read, and the model's retry costs a turn. A closing `cat` is read with `Read` here, in the same turn: its text ends the result of the rest, which runs alone. */
export const readSplit = (on: On): void => {
	on("tool.call", { tool: ["Bash"] }, async ($, e, next) => {
		const split = splitRead(fieldOf(e, "command") ?? "");
		if (split === undefined) {
			return next(e);
		}
		const cwd = await $.session.cwd();
		const path = split.file.startsWith("/")
			? split.file
			: `${cwd}/${split.file}`;
		const answer = await next({ ...e, command: split.rest });
		if (answer.deny !== undefined) {
			return answer;
		}
		// The rest may write the file, so it is read only after the rest ran.
		const read = await $.tool
			.call({ tool: "Read", file_path: path })
			.catch(() => undefined);
		return read === undefined || read.deny !== undefined || !read.text
			? answer
			: { ...answer, result: withRead(answer.result, read.text) };
	});
};
