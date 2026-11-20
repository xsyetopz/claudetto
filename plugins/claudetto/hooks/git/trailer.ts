import type { EngineInterface, On, PluginOptions } from "claude-code";
import { fault } from "../shared/fault";
import { builtinGitOn, ownGitOn } from "./instructions";

/** Matches each `git commit` call, past global flags such as `-C dir`; `commit-tree` and the like do not match. */
const COMMIT = /\bgit\b(?:\s+-[Cc]\s+\S+|\s+--[\w-]+=\S+)*\s+commit\b(?!-)/gu;

/** A message written in the command itself: `-m`, `-am`, `--message`, or `-F -` with a here-document. */
const INLINE = /\s(?:-[a-zA-Z]*m|--message)(?:[\s="']|$)|\s(?:-F|--file)[\s=]+-(?:\s|$)/u;

/** A commit that keeps or builds its message from another commit, so the command holds no message to check. */
const REUSE = /\s(?:--no-edit|-[Cc]|--reuse-message|--reedit-message|--fixup|--squash)(?:[\s=]|$)/u;

/**
 * The lines `attribution.commit` asks for, one per non-blank line.
 *
 * @param attribution The `attribution` setting as read.
 * @returns The lines each commit message must hold; empty when none is set.
 */
export const trailerLines = (attribution: unknown): string[] => {
	const commit = attribution !== null && typeof attribution === "object" ? (attribution as { commit?: unknown }).commit : undefined;
	return typeof commit === "string" ? commit.split("\n").map((line) => line.trim()).filter(Boolean) : [];
};

/**
 * Whether a commit in the command writes its message inline without the
 * attribution lines. Each commit is read up to the next one, so a trailer
 * given in a later `-m` or a here-document counts for the commit it follows.
 * A message from a file or the editor is not in the command and is let through.
 *
 * @param command The Bash command as the model wrote it.
 * @param lines The lines each commit message must hold.
 * @returns True when at least one inline message lacks a line.
 */
export const lacksTrailer = (command: string, lines: string[]): boolean => {
	const starts = [...command.matchAll(COMMIT)].map((match) => match.index);
	return starts.some((start, i) => {
		const part = command.slice(start, starts[i + 1] ?? command.length);
		return INLINE.test(part) && !REUSE.test(part) && lines.some((line) => !part.includes(line));
	});
};

/** The reason a commit is refused, written as the next step because the model reads it. */
export const trailerReason = (lines: string[]): string =>
	`Each commit message ends with ${lines.map((line) => `\`${line}\``).join(", then ")} (the attribution.commit setting), and a commit in this command lacks it. Resend the command with ${lines.length === 1 ? "that line" : "those lines"} at the end of every commit message, for example as a last ${lines.map((line) => `-m "${line}"`).join(" ")}.`;

/** The lines each commit must hold while claudetto's git block is the one sent; none while the builtin block is on. */
async function requiredLines($: EngineInterface): Promise<string[]> {
	if (await builtinGitOn($)) return [];
	return trailerLines(await $.settings.read({ key: "attribution" }));
}

/**
 * Refuses a Bash call whose inline commit message lacks the attribution lines
 * (RISK-501, issue #70). The line in claudetto's git block reaches a single
 * commit request, but a commit scripted inside a larger task left it out in
 * 16 of 16 replays, as it does with the builtin block. A deny keeps the
 * model's own command for auto mode's review, where a rewrite would void it
 * (ADR-0025). It applies only while claudetto's git block replaces the builtin one.
 */
export function registerTrailer(on: On, options: PluginOptions = {}): void {
	if (!ownGitOn(options)) return;
	on("tool.call", { tool: "Bash" }, async ($, e, next) => {
		if (e.tool !== "Bash" || !/\bcommit\b/u.test(e.command)) return next(e);
		// A failed read is logged here and the call passes on, because a fault
		// answered by .catch drops the rewrites of the guards that ran before it,
		// pipefail among them (probe, 2.1.327).
		const lines = await requiredLines($).catch((error: unknown) => (fault($, "commit trailer", error), []));
		return lines.length > 0 && lacksTrailer(e.command, lines) ? { deny: trailerReason(lines) } : next(e);
	}).catch(($, e, next) => (fault($, "commit trailer", next.error), next(e)));
}
