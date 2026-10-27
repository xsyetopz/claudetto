// The permission gate (spec `permission-gate`, D4): it stops only a call that loses bytes for good, tampers with the system, or reads a secret.
// The function is pure except for `Facts.git` and `Facts.userEdits`, which the adapter runs and a test stubs.

import * as T from "../prompts.ts";
import { bashFindings, parseWithGit } from "./bash-findings.ts";
import { fileFindings } from "./file-findings.ts";
import { textOf, verdict } from "./finding.ts";
import type { GitScope } from "./loss.ts";
import type { Places } from "./paths.ts";

/** The `git` facts of the project: the aliases of its config (`git config --get-regexp '^alias\.'`) and its commands (`git --list-cmds=main,others`). */
export interface GitConfig {
	aliases: Readonly<Record<string, string>>;
	commands: readonly string[];
}

/** The folders of the session, `hasEnvFile` (the base names of the env files of the project, or `undefined` when the adapter cannot tell; a gate with no `hasEnvFile` counts it as `undefined`), `git` (`"clean"` when the files of `paths` in `scope` have a commit and no change), `userEdits` (the changed files of `dir` that the edit ledger does not know), and `gitConfig` (the `git` facts, or `undefined` when `git` cannot give them; a gate with no `gitConfig` uses `GIT_COMMON_COMMANDS`). */
export type Facts = Places & {
	gitConfig?: () => Promise<GitConfig | undefined>;
	hasEnvFile?: () => Promise<readonly string[] | undefined>;
	git: (
		scope: GitScope,
		dir: string,
		paths: string[],
	) => Promise<"clean" | "dirty">;
	userEdits: (dir: string) => Promise<string[]>;
};

/** A `secret` verdict gives no `!` command in its reason. */
export interface Verdict {
	decision: "allow" | "ask" | "deny";
	reason?: string;
	secret?: true;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/** True when a gate can match the call: its input has a command, a path, or a pattern. Each other call is allowed with no read of the session. */
export const gated = (input: unknown): boolean =>
	isRecord(input) &&
	["command", "file_path", "notebook_path", "path", "pattern", "glob"].some(
		(k) => typeof input[k] === "string",
	);

/** The verdicts of `checks`, run one after the other, because each one runs `git` or reads the ledger. */
const runChecks = async (
	checks: (() => Promise<Verdict | undefined>)[],
	index = 0,
	found: Verdict[] = [],
): Promise<Verdict[]> => {
	const check = checks[index];
	if (check === undefined) {
		return found;
	}
	const result = await check();
	return runChecks(checks, index + 1, result ? [...found, result] : found);
};

/**
 * The verdict of the gate for the call of `tool` with `input`.
 * The strictest finding wins, and each `git` check runs only when no finding denies.
 * An `ask` gives the reason of each finding that asks.
 * A `deny` of a `Bash` command that reads no secret gives the exact `!` command for the user.
 * `agentId` is set only for a call of a subagent.
 */
export const gate = async (
	{
		tool,
		input,
		agentId,
	}: { tool: string; input: unknown; agentId?: string | undefined },
	f: Facts,
): Promise<Verdict> => {
	const fields = isRecord(input) ? input : {};
	const command = textOf(fields, "command");
	const findings =
		tool === "Bash" || tool === "Monitor"
			? bashFindings(
					command,
					f,
					agentId !== undefined,
					await parseWithGit(command, f),
				)
			: fileFindings(tool, fields, f);
	const verdicts = findings.filter((x) => typeof x !== "function");
	const denied = verdicts.find((v) => v.decision === "deny");
	if (denied) {
		return verdict(
			"deny",
			tool === "Bash" && !denied.secret
				? `${denied.reason}\n${T.RUN_HINT({ command })}`
				: (denied.reason ?? ""),
		);
	}
	verdicts.push(
		...(await runChecks(findings.filter((x) => typeof x === "function"))),
	);
	const asks = verdicts.filter((v) => v.decision === "ask");
	if (asks.length === 0) {
		return { decision: "allow" };
	}
	const reason = [...new Set(asks.map((v) => v.reason))].join("\n");
	return verdict("ask", reason);
};
