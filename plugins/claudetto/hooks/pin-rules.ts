import { type Command, parse, programOf } from "./gate/shell-words.ts";
import { fieldOf } from "./gate/verdict.ts";
import type { PinConstraint } from "./texts-handoff.ts";
import { isWriter } from "./tools.ts";

const IN_PLACE = /^-[a-z]*i/u;
const WRITE_PROGRAMS = new Set([
	"tee",
	"mv",
	"cp",
	"rm",
	"mkdir",
	"touch",
	"patch",
	"ln",
	"chmod",
	"truncate",
]);
const GIT_WRITES = new Set([
	"commit",
	"add",
	"checkout",
	"restore",
	"reset",
	"stash",
	"apply",
	"merge",
	"rebase",
	"mv",
	"rm",
	"clean",
	"cherry-pick",
	"revert",
]);

const writesFile = (c: Command): boolean =>
	c.redirects.some(
		(r) => !r.op.startsWith("<") && r.op !== ">&" && r.target !== "/dev/null",
	);

const writesFiles = (c: Command): boolean => {
	const { name, args } = programOf(c);
	const sub = args.find((a) => !a.startsWith("-")) ?? "";
	return (
		writesFile(c) ||
		WRITE_PROGRAMS.has(name) ||
		(name === "sed" && args.some((a) => IN_PLACE.test(a))) ||
		(name === "bun" && ["add", "install", "remove"].includes(sub))
	);
};

const bashWrites = (
	command: string,
	git: Set<string> = GIT_WRITES,
	anyWrite = true,
): boolean =>
	parse(command).commands.some((c) => {
		const { name, args } = programOf(c);
		const sub = args.find((a) => !a.startsWith("-")) ?? "";
		return (anyWrite && writesFiles(c)) || (name === "git" && git.has(sub));
	});

/** Whether a tool call breaks a constraint of the ledger. */
export const breaks = (
	c: PinConstraint,
	tool: string,
	input: unknown,
): boolean => {
	const command = tool === "Bash" ? fieldOf(input, "command") : undefined;
	const bash = (git?: Set<string>, anyWrite?: boolean): boolean =>
		command !== undefined && bashWrites(command, git, anyWrite);
	const rules: Record<PinConstraint["rule"], () => boolean> = {
		"read-only": () => isWriter(tool) || bash(),
		"no-commit": () => bash(new Set(["commit"]), false),
		"no-push": () => bash(new Set(["push"]), false),
		"only-files": () => {
			const path =
				fieldOf(input, "file_path") ?? fieldOf(input, "notebook_path") ?? "";
			return isWriter(tool) && !(c.files ?? []).some((f) => path.endsWith(f));
		},
		"no-questions": () => false,
		none: () => false,
	};
	return rules[c.rule]();
};
