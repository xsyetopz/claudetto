import type { EngineInterface, On } from "claude-code";

import { fault } from "../shared/fault";

/**
 * Matches a Bash call that edits files in place with perl, wherever perl sits in
 * command position: first, after a separator, or run by `xargs`, `find -exec` or
 * a loop or `if` body, because a rename is usually `git grep -l x | xargs perl -pi`.
 * The `m` flag lets `^` match each line, because the shell guard puts the model's
 * command on a line of its own below `exec </dev/null`.
 */
export const PERL_EDIT =
	/(?:^|[;&|({]|\b(?:do|then|else|xargs(?:\s+-\S+)*)|-exec)\s*perl\s+(?:-\S*\s+)*-\S*i/mu;

/** The `git diff --stat` of the files, as printed. */
async function diffStat($: EngineInterface, files: string[]): Promise<string> {
	const { stdout } = await $.process.run([
		"git",
		"diff",
		"--stat",
		"--",
		...files
	]);
	return stdout;
}

/** Files whose `git diff --numstat` line differs between `before` and `after`. */
export const touched = (before: string, after: string): string[] => {
	const old = new Set(before.split("\n"));
	return after
		.split("\n")
		.filter((line) => line !== "" && !old.has(line))
		.map((line) => line.split("\t")[2] ?? "")
		.filter((path) => path !== "");
};

/**
 * The note the model reads after a perl edit: the diff stat of each changed
 * file, then the step that keeps a later Write working, because Write refuses
 * a file changed on disk since its last Read.
 */
export const note = (stat: string): string =>
	`${stat.trimEnd()}\nRead each file above again before you Write it, because Write refuses a file that changed after its last Read. Check the stat against the edit you meant; a regex that matched nothing shows no line.`;

/**
 * Shows what a perl in-place edit changed (REQ-EDIT-002). One perl call
 * replaces many Edit calls, and the diff stat makes a typo'd regex that
 * changed nothing, or too much, visible in the same turn.
 */
export function registerPerl(on: On): void {
	on("tool.call", { tool: "Bash" }, async ($, e, next) => {
		if (e.tool !== "Bash" || !PERL_EDIT.test(e.command)) {
			return next(e);
		}
		const numstat = async (): Promise<string> => {
			const r = await $.process.run(["git", "diff", "--numstat"]);
			return r.exitCode === 0 ? r.stdout : "";
		};
		const before = await numstat();
		const r = await next(e);
		if (r.deny !== undefined || r.isError === true) {
			return r;
		}
		const files = touched(before, await numstat());
		const stat =
			files.length === 0
				? "No tracked file changed."
				: await diffStat($, files);
		return { ...r, context: [...(r.context ?? []), note(stat)] };
	}).catch(($, e, next) => {
		fault($, "perl diff", next.error);
		return next(e);
	});
}
