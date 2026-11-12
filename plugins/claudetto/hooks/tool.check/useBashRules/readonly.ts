import { type Command, parse, programOf } from "./shell-words.ts";

const READS = new Set([
	"cd",
	"ls",
	"grep",
	"rg",
	"wc",
	"pwd",
	"which",
	"echo",
	"stat",
	"du",
	"df",
	"head",
	"tail",
]);
const GIT_READS = new Set(["status", "diff", "log"]);
// `git diff --output=file` writes a file and `rg --pre cmd` runs one.
const WRITES_OR_RUNS = /^--(?:output|pre)\b/u;
const FD = /^\d+$/u;

// Only input redirects, `2>&1`, and `/dev/` targets leave no file behind.
const quiet = (c: Command): boolean =>
	c.redirects.every((r) =>
		r.op.startsWith("<")
			? r.op !== "<>"
			: r.target.startsWith("/dev/") || (r.op === ">&" && FD.test(r.target)),
	);

/** Whether every command of the text only reads. A test run is no read: it runs whatever the test files hold, so it passes only through the sandbox's own auto-allow. A wrapper (`sudo`, `env`, an assignment) before the program, a shell, a network tool, or a file redirect makes it false. */
export const readOnly = (command: string): boolean => {
	const { commands, unreadable } = parse(command);
	return (
		!unreadable &&
		commands.length > 0 &&
		commands.every((c) => {
			const { name, args, at } = programOf(c);
			return (
				at === 0 &&
				quiet(c) &&
				!args.some((a) => WRITES_OR_RUNS.test(a)) &&
				(READS.has(name) || (name === "git" && GIT_READS.has(args[0] ?? "")))
			);
		})
	);
};
