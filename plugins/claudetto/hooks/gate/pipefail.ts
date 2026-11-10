import { GATE_MASKED_EXIT } from "../texts-gate.ts";
import { type Command, programOf } from "./shell-words.ts";
import { withoutGitOptions } from "./upstream.ts";
import { deny, type Verdict } from "./verdict.ts";

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

/** Denies a check piped into `tail`, `head`, or `grep`, and a `git commit` or `git push` after any pipe, when no earlier `set -o pipefail` keeps the exit code. */
export const maskedExitVerdict = (commands: Command[]): Verdict | undefined => {
	const published = commands.findIndex((c) => publishes(c));
	const lost =
		masks(commands, commands.length, true) ||
		(published !== -1 && masks(commands, published, false));
	return lost ? deny(GATE_MASKED_EXIT) : undefined;
};
