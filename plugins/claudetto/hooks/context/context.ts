import type { EngineInterface, On } from "claude-code";

import { fault } from "../shared/fault";
import { fieldOf } from "../shared/field";

/** A Bash command that runs `git checkout` or `git switch`, alone or after `&&` or `;`. */
const SWITCH = /(?:^|&&|;)\s*git\s+(?:checkout|switch)\b/u;

/** A Bash command with a pipe (not `||`) into a filter that keeps only its own exit status. */
const FILTERED =
	/(?<!\|)\|&?\s*(?:tail|head|grep|egrep|fgrep|rg|sed|awk|wc|cut|sort|uniq|tr|tee)\b/u;

/** The first output line that starts with `error:` or `fatal:`. */
const FAILURE_LINE = /^(?:error|fatal):.*$/mu;

/** What a Bash tool response printed: its stdout, then its stderr. */
export const outputOf = (response: unknown): string => {
	if (typeof response === "string") {
		return response;
	}
	return ["stdout", "stderr"]
		.map((key) => fieldOf(response, key))
		.filter((part): part is string => typeof part === "string")
		.join("\n");
};

/** The trimmed stdout of a `git` call that exits 0 with output, else undefined. */
async function git(
	$: EngineInterface,
	cwd: string,
	argv: string[]
): Promise<string | undefined> {
	const r = await $.process.run(["git", ...argv], { cwd });
	const text = r.stdout.trim();
	return r.exitCode === 0 && text !== "" ? text : undefined;
}

/** `6 ahead, 2 behind origin/main` from a `rev-list --left-right --count` line; `level with` when both are 0. */
export const standing = (counts: string, upstream: string): string => {
	const [behind = 0, ahead = 0] = counts.split(/\s+/u).map(Number);
	const parts = [
		ahead > 0 ? `${ahead} ahead` : "",
		behind > 0 ? `${behind} behind` : ""
	].filter((part) => part !== "");
	return parts.length === 0
		? `level with ${upstream}`
		: `${parts.join(", ")} ${upstream}`;
};

/** The note for a switch whose output holds `unable to unlink`. */
export const PARTIAL =
	"The switch is partial: git reported `unable to unlink`, so the working tree may be half-switched. Run `git status` to see which files are in which state.";

/** Where HEAD stands after a switch (REQ-GUARDS-080): its commit, branch and upstream count. */
export async function headNote(
	$: EngineInterface,
	cwd: string,
	output: string
): Promise<string> {
	const partial = output.includes("unable to unlink");
	const commit = await git($, cwd, ["rev-parse", "--short=9", "HEAD"]);
	if (commit === undefined) {
		return partial ? PARTIAL : "";
	}
	const branch = await git($, cwd, ["symbolic-ref", "--short", "-q", "HEAD"]);
	const upstream = await git($, cwd, [
		"rev-parse",
		"--abbrev-ref",
		"@{upstream}"
	]);
	const counts =
		upstream === undefined
			? undefined
			: await git($, cwd, [
					"rev-list",
					"--left-right",
					"--count",
					"@{upstream}...HEAD"
				]);
	const where = branch === undefined ? "detached" : `on ${branch}`;
	const tail =
		upstream === undefined || counts === undefined
			? ""
			: `, ${standing(counts, upstream)}`;
	const head = `HEAD ${commit} ${where}${tail}`;
	return partial ? `${head}. ${PARTIAL}` : head;
}

/** The note for a filtered pipeline that printed a failure line (REQ-GUARDS-081), or "". */
export const pipeNote = (output: string): string => {
	const line = FAILURE_LINE.exec(output)?.[0];
	return line === undefined
		? ""
		: `The output holds "${line}". The exit status shown is the last pipe stage's, not that of the command before the pipe, so a clean status does not show that command succeeded.`;
};

/** Appends one context entry to what the rest of the chain returned. */
const withContext = (
	result: { additionalContext?: string[] },
	note: string
): { additionalContext?: string[] } =>
	note === ""
		? result
		: {
				...result,
				additionalContext: [...(result.additionalContext ?? []), note]
			};

/**
 * Adds context after a Bash call and blocks nothing (REQ-GUARDS-080, REQ-GUARDS-081).
 * The classic PostToolUse matcher narrows each hook to its command, so a handler runs
 * only for a `git checkout` / `git switch` or a filtered pipeline. A leaf matcher cannot
 * span stdout and stderr, so the output test stays in the handler.
 */
export function registerContext(on: On): void {
	on(
		"classic.PostToolUse",
		{ tool_name: "Bash", tool_input: { command: SWITCH } },
		async ($, e, next) => {
			const result = await next(e);
			const note = await headNote($, e.cwd, outputOf(e.tool_response));
			return withContext(result, note);
		}
	).catch(($, _e, next) => {
		fault($, "switch context", next.error);
	});
	// A checkout that stops partway fails the call, and its error text carries the output.
	on(
		"classic.PostToolUseFailure",
		{ tool_name: "Bash", tool_input: { command: SWITCH } },
		async ($, e, next) => {
			const result = await next(e);
			return withContext(result, await headNote($, e.cwd, e.error));
		}
	).catch(($, _e, next) => {
		fault($, "switch failure context", next.error);
	});
	on(
		"classic.PostToolUse",
		{ tool_name: "Bash", tool_input: { command: FILTERED } },
		async (_$, e, next) => {
			const result = await next(e);
			if (fieldOf(e.tool_response, "interrupted") === true) {
				return result;
			}
			return withContext(result, pipeNote(outputOf(e.tool_response)));
		}
	).catch(($, _e, next) => {
		fault($, "pipe context", next.error);
	});
}
