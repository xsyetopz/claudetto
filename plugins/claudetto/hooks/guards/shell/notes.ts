import type { On } from "claude-code";

import { fault } from "../../shared/fault";
import { fieldOf } from "../../shared/field";
import {
	API_KEY_NOTE,
	type BashAnswer,
	GREP_COUNT_NOTE,
	hasNoChecks,
	isZeroCount,
	missingCommand,
	missingNote,
	needsApiKey,
	NO_CHECKS_NOTE
} from "./missing";

const stringOf = (value: unknown): string | undefined =>
	typeof value === "string" ? value : undefined;

/** The longest a note may be: the model reads each beside a tool result. */
export const NOTE_LIMIT = 200;

/**
 * A command word that checks something: a test, lint, build or type run, bare
 * or behind a package runner. Matching command position keeps `git commit -m
 * "fix test"` and `echo test` out.
 */
const CHECK =
	/(?:^|[;&|(]\s*)(?:(?:bun|bunx|npm|npx|pnpm|yarn|just|cargo|go|make|uv|python3?\s+-m)\s+(?:run\s+)?)?(?:test|lint|build|check|typecheck|tsc|pytest|vitest|jest|eslint|oxlint|mypy|ruff)\b/u;

/** Command text up to the next `|`, `;`, `&` or newline; the `&` of a `2>&1` redirect belongs to it. */
const ARGS = String.raw`(?:[^|;&\n]|(?<=>)&)*`;

/** A check whose output goes into a filter that sets the pipeline's exit status. */
const FILTERED = new RegExp(
	`${CHECK.source}${ARGS}\\|\\s*(?:tail|head|grep|tee|wc|cat)\\b`,
	"u"
);

/** A check followed by `;` and another command: the second one's status is the result. */
const CHAINED = new RegExp(
	`${CHECK.source}${ARGS}(?<!\\\\);(?!;)\\s*(?!echo\\b[^\\n]*\\$\\?)\\S`,
	"u"
);

/** A command that ends in `; echo ...`, closing group or not. */
const ENDS_IN_ECHO = /;\s*echo\b[^;&|\n]*(?:\n\})?\s*$/u;

/** An `exit $rc` or `exit $?` that hands the check's status to the completion notice. */
const EXITS_WITH_STATUS = /\bexit\s+"?\$\??\w*/u;

/** `name="a b"` or `name='a b'`: a scalar that holds a space. */
const SPACED = /\b([A-Za-z_]\w*)=(["'])[^"'\n]*\s[^"'\n]*\2/gu;

/** What a run of the command needs to know about the shell it lands in. */
export interface ShellFacts {
	/** The command runs in the background (`run_in_background`). */
	isBackground: boolean;
	/** The session's shell is zsh. */
	isZsh: boolean;
}

/**
 * Names each unquoted variable that holds spaces, which zsh does not split, in
 * a note that gives `${=var}` and the array form.
 *
 * @param command The Bash command as the model wrote it.
 * @returns One note per such variable.
 */
export const zshNotes = (command: string): string[] =>
	[...command.matchAll(SPACED)].flatMap(([, name]) =>
		name !== undefined &&
		new RegExp(String.raw`(?<!["{=\w])\$${name}\b`, "u").test(command)
			? [
					`zsh does not split an unquoted $${name} on spaces. Use \${=${name}}, or an array: ${name}=(a b); cmd $${name}.`
				]
			: []
	);

/**
 * Names the ways a Bash command hides a failure from the model, each as one
 * line of at most NOTE_LIMIT characters:
 * a background command ending in `; echo` whose exit code is the echo's; a
 * check piped into a filter or chained by `;`, so the check's status is lost;
 * and, in zsh, an unquoted variable holding spaces, which zsh does not split.
 *
 * @param command The Bash command as the model wrote it.
 * @param facts The call's mode and shell.
 * @returns One note per finding, or none.
 */
export const shellNotes = (command: string, facts: ShellFacts): string[] => {
	const notes: string[] = [];
	if (
		facts.isBackground &&
		ENDS_IN_ECHO.test(command) &&
		!EXITS_WITH_STATUS.test(command)
	) {
		notes.push(
			"A background command ending in `; echo` reports exit 0 to the completion notice, even when it prints $?. Save `rc=$?` after the check and end with `exit $rc`."
		);
	}
	if (FILTERED.test(command) && !/pipefail/u.test(command)) {
		notes.push(
			"`check | tail` exits with tail's status, so a failed check looks like success. Start with `set -o pipefail;` to keep the check's status."
		);
	} else if (CHAINED.test(command)) {
		notes.push(
			"`check; next` runs next even when the check fails, and the exit code is next's. Chain with `&&` so a failure stops the line and shows."
		);
	}
	if (facts.isZsh) {
		notes.push(...zshNotes(command));
	}
	return notes;
};

/**
 * Adds a note to a Bash result when the command hides a failure (ISSUES
 * 2026-11-21: background `; echo`, pipe and chain status, zsh word splitting),
 * and to a result that shows a missing command (install it and keep the check)
 * a `grep -c` zero count (zero matches, not a failure), or a `gh pr checks`
 * that reports no checks (none registered yet, not a pass; ISSUES #127), and a model call
 * stopped for lack of an API key (run it on the session's login; RISK-379). The command runs as
 * written; the notes only tell the model what its exit status can and cannot show.
 */
export function registerNotes(on: On): void {
	on("tool.call", { tool: "Bash" }, async ($, e, next) => {
		if (e.tool !== "Bash") {
			return next(e);
		}
		// SHELL is read only when the command could trip zsh, so other calls need no env.
		const spaced = zshNotes(e.command).length > 0;
		const shell = spaced ? ((await $.env.get("SHELL")) ?? "") : "";
		const notes = shellNotes(e.command, {
			isBackground: e.run_in_background === true,
			isZsh: shell.endsWith("zsh")
		});
		const r = await next(e);
		if (r.deny !== undefined) {
			return r;
		}
		// ENGINE(v2.1.330): a failed Bash call is an error result whose text begins "Exit code N".
		const answer: BashAnswer = {
			text: r.isError === true ? r.text : undefined,
			stdout: stringOf(fieldOf(r.result, "stdout")),
			stderr: stringOf(fieldOf(r.result, "stderr"))
		};
		const missing = missingCommand(e.command, answer);
		if (missing !== undefined) {
			const setup = await $.process.run(["just", "--show", "setup"]);
			notes.push(missingNote(missing, setup.exitCode === 0));
		}
		if (isZeroCount(e.command, answer)) {
			notes.push(GREP_COUNT_NOTE);
		}
		if (hasNoChecks(e.command, answer)) {
			notes.push(NO_CHECKS_NOTE);
		}
		if (needsApiKey(answer)) {
			notes.push(API_KEY_NOTE);
		}
		if (notes.length === 0) {
			return r;
		}
		return { ...r, context: [...(r.context ?? []), ...notes] };
	}).catch(($, e, next) => {
		fault($, "shell notes", next.error);
		return next(e);
	});
}
