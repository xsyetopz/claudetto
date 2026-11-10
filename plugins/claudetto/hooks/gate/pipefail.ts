import { GATE_MASKED_EXIT } from "../texts-gate.ts";
import { type Command, programOf } from "./shell-words.ts";
import { withoutGitOptions } from "./upstream.ts";
import { deny, type Verdict } from "./verdict.ts";

const PUBLISHES = new Set(["commit", "push"]);

const publishes = (c: Command): boolean => {
	const { name, args } = programOf(c);
	return name === "git" && PUBLISHES.has(withoutGitOptions(args)[0] ?? "");
};

const setsPipefail = (c: Command): boolean => {
	const { name, args } = programOf(c);
	return name === "set" && args.includes("pipefail");
};

/** Denies a `git commit` or `git push` that runs after a pipe in the same command when no earlier `set -o pipefail` keeps a failed check's exit code. */
export const maskedExitVerdict = (commands: Command[]): Verdict | undefined => {
	const at = commands.findIndex((c) => publishes(c));
	const before = commands.slice(0, Math.max(at, 0));
	return before.some((c) => c.into) && !before.some((c) => setsPipefail(c))
		? deny(GATE_MASKED_EXIT)
		: undefined;
};
