import type { On } from "claude-code";

import { fault } from "../shared/fault";

/**
 * Body lines from which a heredoc file write is refused. A 40-line file is about
 * 1,500 tokens, and the thread behind RISK-590 saw a mangled heredoc resent whole
 * each time; a shorter body costs less to resend than a refusal costs to read.
 */
export const MAX_BODY_LINES = 40;

/** What the model reads when a large heredoc file write is refused (GUARDS-086). */
export const REASON =
	"Write this file with the `mcp__claudetto__patch` tool (`*** Add File: path`, then `+` lines) instead of a large heredoc: " +
	"a shell mangles quotes, `$` and backticks in a long body, and a resend costs the whole file again. " +
	"A heredoc up to 40 lines, or one fed to a program's stdin, is fine.";

/** A heredoc: its start line (group 1) and its body (group 4), up to the delimiter line. */
const HEREDOC =
	/^([^\n]*?<<-?[ \t]*(['"]?)(\w+)\2[^\n]*)\n([\s\S]*?)\n[ \t]*\3[ \t]*$/gmu;

/** The start line's command is `cat` or `tee`, which copy their input to a file. */
const COPIER = /(?:^|[;&|({])\s*(?:\w+=\S*\s+)*(?:cat|tee)\b/u;

/** A redirect to a file: `>` or `>>` whose target is not a descriptor or /dev/. */
const REDIRECT = /(?:^|[^<>&\d])\d?>>?[ \t]*(?!&|\/dev\/)["'\w./~$-]/u;

/** `tee` with a file name argument. */
const TEE_FILE = /\btee\s+(?:-\w+\s+)*["'\w./~$]/u;

/**
 * Whether a Bash command writes a file through a heredoc body over
 * `MAX_BODY_LINES` lines: `cat > f <<EOF`, `cat <<EOF >> f`, `tee f <<EOF`.
 * A heredoc fed to another program (`python3 - <<EOF`, `psql <<SQL`) or a pipe
 * writes no file, and text that only names a heredoc inside quotes is not one.
 *
 * @param command The Bash command as the model wrote it.
 * @returns True when the command is a large heredoc file write.
 */
export const writesLargeHeredoc = (command: string): boolean => {
	for (const match of command.matchAll(HEREDOC)) {
		const start = match[1] ?? "";
		const body = match[4] ?? "";
		const copies = COPIER.test(start);
		const writes = REDIRECT.test(start) || TEE_FILE.test(start);
		if (copies && writes && body.split("\n").length > MAX_BODY_LINES) {
			return true;
		}
	}
	return false;
};

/**
 * Refuses a large heredoc file write with a pointer to the patch tool's Add
 * File form (GUARDS-086). The check runs on the model's own command, so the
 * body is judged as written.
 */
export function registerHeredoc(on: On): void {
	on("tool.call", { tool: "Bash" }, (_$, e, next) =>
		e.tool === "Bash" && writesLargeHeredoc(e.command)
			? { deny: REASON }
			: next(e)
	).catch(($, e, next) => {
		fault($, "heredoc write guard", next.error);
		return next(e);
	});
}
