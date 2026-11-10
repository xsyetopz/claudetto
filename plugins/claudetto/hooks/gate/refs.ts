import { GATE_REF_MOVE } from "../texts.ts";
import { ownedMove, type Owns } from "./processes.ts";
import { withoutGitOptions } from "./upstream.ts";
import { ask, type Verdict } from "./verdict.ts";

const MODES = new Set(["--soft", "--mixed", "--keep", "--merge", "--hard"]);
// A name a fetch, merge, or reset writes to `.git`, which resolves to one of several commits.
const PSEUDO = /^(FETCH_HEAD|ORIG_HEAD|MERGE_HEAD|CHERRY_PICK_HEAD)\b/;
// `-f` alone, inside a cluster of short flags (`-fM`), or `--force`.
const FORCE = /^(?:-[A-Za-z]*f[A-Za-z]*|--force)$/;
const AT_HEAD = /^(HEAD|@)([~^]\d*)*$/;

/** Asks before a command moves a branch to another commit: a `reset` to a ref other than `HEAD`, `update-ref`, or `branch -f`, unless it moves one branch this session owns. A `reset` moves the current branch, which the hook cannot know cheaply, so it keeps asking. */
export const refVerdict = (
	name: string,
	args: string[],
	own: Owns,
): Verdict | undefined => {
	if (name !== "git") {
		return undefined;
	}
	const [verb = "", ...rest] = withoutGitOptions(args);
	const end = rest.indexOf("--");
	const before = end < 0 ? rest : rest.slice(0, end);
	const flags = before.filter((a) => a.startsWith("-"));
	const target = before.find((a) => !a.startsWith("-"));
	const moves =
		(verb === "reset" &&
			target !== undefined &&
			(PSEUDO.test(target) ||
				(flags.some((f) => MODES.has(f)) && !AT_HEAD.test(target)))) ||
		verb === "update-ref" ||
		(verb === "branch" && flags.some((f) => FORCE.test(f)));
	return moves && !ownedMove(name, args, own) ? ask(GATE_REF_MOVE) : undefined;
};
