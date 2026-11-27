import type { On } from "claude-code";

import { fault } from "../shared/fault";

/**
 * The Bash recipes that lived in the output style. The source for the
 * placement is howborisusesclaudecode.com ("The New Rules of Context
 * Engineering"): tool instructions belong in the tool description only.
 * The text starts with a blank line so it follows the short Bash text.
 */
export const BASH_RECIPES = [
	"",
	"",
	"With `run_in_background`, the completion notice reports only the last command's exit status, so a trailing `echo`, a pipe into `tail`, or `&` hides a failure. End a check with `set -o pipefail` before any pipe, `rc=$?` right after the check, the trailing step, then `exit $rc`; end the line at `exit $rc`. Leave out `exit $rc` when the user said the failure is expected.",
	"",
	"When the reply depends on a background command, `mcp__claudetto__read` its output path after the other work and before replying, and say what it showed or that it is still running. A server or watcher needs only its start-up line.",
	"",
	"One change repeated across places or files (a rename, a reworded phrase): run `perl -pi -e` or `perl -0pi -e` on the `git grep -l` files. It runs without a permission prompt, claudetto shows its diff stat, and `sed -i` flags differ between macOS and GNU. Use `mcp__claudetto__patch` when the change differs at each place."
].join("\n");

/**
 * Appends {@link BASH_RECIPES} to the Bash description. Register it before
 * `registerToolDescribe`, which ends the chain, so the text lands on the
 * short Bash text.
 *
 * @param on The engine's hook registrar.
 */
export function registerBashRecipes(on: On): void {
	on("tool.describe", { tool: "Bash" }, async (_$, e, next) => {
		const result = await next(e);
		return {
			...result,
			description: `${result.description}${BASH_RECIPES}`
		};
	}).catch(($, e, next) => {
		fault($, "bash recipes", next.error);
		return next(e);
	});
}
