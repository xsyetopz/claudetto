import { GATE_MASKED_EXIT, GATE_UNSTOPPED_COMMIT } from "../../texts-gate";
import { type Command, programOf } from "./shell-words";
import { withoutGitOptions } from "./upstream";
import { deny, type Verdict } from "./verdict";

const PUBLISHES = new Set(["commit", "push"]);
const TRIMMERS = new Set(["tail", "head", "grep", "rg"]);
// A runner counts as a check only through these verbs, so `bun pm ls | grep x` stays a listing.
const CHECK_VERBS: Readonly<Record<string, ReadonlySet<string> | "any">> = {
	bun: new Set(["test", "run", "check", "x", "fmt", "build", "lint"]),
	npm: new Set(["test", "run", "exec"]),
	pnpm: new Set(["test", "run", "exec"]),
	yarn: new Set(["test", "run"]),
	deno: new Set(["test", "check", "lint", "fmt", "task"]),
	cargo: new Set(["test", "build", "check", "clippy", "nextest"]),
	go: new Set(["test", "build", "vet"]),
	claude: new Set(["plugin"]),
	bunx: "any",
	npx: "any",
	just: "any",
	make: "any",
	pytest: "any",
	tsc: "any",
	oxlint: "any",
	eslint: "any",
	biome: "any",
	ruff: "any",
	mypy: "any",
};

const publishes = (c: Command): boolean => {
	const { name, args } = programOf(c);
	return name === "git" && PUBLISHES.has(withoutGitOptions(args)[0] ?? "");
};

const setsPipefail = (c: Command): boolean => {
	const { name, args } = programOf(c);
	return name === "set" && args.includes("pipefail");
};

const isCheck = (c: Command): boolean => {
	const { name, args } = programOf(c);
	const verbs = CHECK_VERBS[name];
	return verbs === "any" || (verbs?.has(args[0] ?? "") ?? false);
};

const trims = (c: Command | undefined): boolean =>
	c !== undefined && TRIMMERS.has(programOf(c).name);

/** Whether a check's exit code is lost before command `at`: a pipe with no earlier `set -o pipefail`. */
const masks = (commands: Command[], at: number, check: boolean): boolean => {
	const before = commands.slice(0, at);
	return (
		!before.some((c) => setsPipefail(c)) &&
		before.some(
			(c, i) => c.into && (!check || (isCheck(c) && trims(commands[i + 1]))),
		)
	);
};

const JOINS = new Set(["&&", "||", "|"]);
const LOOPS = new Set(["for", "while", "until", "select"]);
// A check in a `while`, `until`, or `if` line is a condition that steers the shell, so it stops nothing and loses nothing.
const CONDITIONS = new Set(["if", "elif", "while", "until"]);
const LEAVES = new Set(["exit", "return"]);

const stopsOnError = (c: Command): boolean => {
	const { name, args } = programOf(c);
	return (
		name === "set" && args.some((a) => /^-[a-z]*e/u.test(a) || a === "errexit")
	);
};

interface Walk {
	/** A check ended a list that left the commit running after a failure. */
	loose: boolean;
	/** A check in an open loop body ended its list. */
	inLoop: boolean;
	loops: number;
	/** A check sits in the current list. */
	listed: boolean;
	/** Only `&&` and pipes join that check to the command now read. */
	tied: boolean;
}

const closeList = (w: Walk): void => {
	if (w.loops > 0) {
		w.inLoop ||= w.listed;
	} else {
		w.loose ||= w.listed;
	}
	w.listed = false;
	w.tied = false;
};

const step = (w: Walk, c: Command, before: string | undefined): void => {
	const first = c.words[0] ?? "";
	if (LOOPS.has(first)) {
		w.loops++;
	}
	if (first === "done") {
		w.loops = Math.max(0, w.loops - 1);
		w.loose ||= w.inLoop && w.loops === 0;
		w.inLoop &&= w.loops > 0;
	}
	if (LEAVES.has(programOf(c).name) && before === "||") {
		w.listed = false;
		w.tied = false;
	}
	if (isCheck(c) && !CONDITIONS.has(first)) {
		w.listed = true;
		w.tied = true;
	}
	w.tied &&= c.ends !== "||";
};

/** Whether a check ahead of the `git commit` at `at` can fail with the commit still running: the check ends a list that `;`, a newline, or `&` closes, a loop holds it, or `||` hands its failure to a command that does not leave. */
const unstopped = (commands: Command[], at: number): boolean => {
	const walk: Walk = {
		loose: false,
		inLoop: false,
		loops: 0,
		listed: false,
		tied: false,
	};
	for (const [i, c] of commands.slice(0, at + 1).entries()) {
		if (i > 0 && !JOINS.has(commands[i - 1]?.ends ?? "")) {
			closeList(walk);
		}
		if (i < at) {
			step(walk, c, commands[i - 1]?.ends);
		}
	}
	return walk.loose || walk.inLoop || (walk.listed && !walk.tied);
};

/** Denies a `git commit` that a failed check before it does not stop. */
export const unstoppedCommitVerdict = (
	commands: Command[],
): Verdict | undefined => {
	const lost = commands.some(
		(c, i) =>
			programOf(c).name === "git" &&
			withoutGitOptions(programOf(c).args)[0] === "commit" &&
			!commands.slice(0, i).some((p) => stopsOnError(p)) &&
			unstopped(commands, i),
	);
	return lost ? deny(GATE_UNSTOPPED_COMMIT) : undefined;
};

/** Denies a check piped into `tail`, `head`, or `grep`, and a `git commit` or `git push` after any pipe, when no earlier `set -o pipefail` keeps the exit code. */
export const maskedExitVerdict = (commands: Command[]): Verdict | undefined => {
	const published = commands.findIndex((c) => publishes(c));
	const lost =
		masks(commands, commands.length, true) ||
		(published !== -1 && masks(commands, published, false));
	return lost ? deny(GATE_MASKED_EXIT) : undefined;
};
