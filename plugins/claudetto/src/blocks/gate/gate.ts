import { bashFindings, parseWithGit } from "./findings/bash.ts";
import { fileFindings } from "./findings/file.ts";
import { textOf, verdict } from "./findings/finding.ts";
import type { GitScope } from "./loss.ts";
import type { Places } from "./paths.ts";
import * as T from "./prompts.ts";

export interface GitConfig {
	aliases: Readonly<Record<string, string>>;
	commands: readonly string[];
}

export type Facts = Places & {
	gitConfig?: () => Promise<GitConfig | undefined>;
	hasEnvFile?: () => Promise<readonly string[] | undefined>;
	/** The push URLs of the remotes of the repository at `dir`, or `undefined` when `git` cannot read them. */
	pushUrls?: (dir: string) => Promise<readonly string[] | undefined>;
	git: (
		scope: GitScope,
		dir: string,
		paths: string[],
	) => Promise<"clean" | "dirty">;
	userEdits: (dir: string) => Promise<string[]>;
};

export type Decision = "allow" | "ask" | "deny";

/** A `secret` verdict gives no `!` command in its reason. */
export interface Verdict {
	decision: Decision;
	reason?: string;
	secret?: true;
	/** An `ask` that only a person settles: a classifier's allow does not. */
	person?: true;
}

const STRICTNESS: readonly Decision[] = ["allow", "ask", "deny"];

export const stricter = (a: Decision, b: Decision): Decision =>
	STRICTNESS.indexOf(a) >= STRICTNESS.indexOf(b) ? a : b;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

export const GATED_KEYS: readonly string[] = [
	"command",
	"file_path",
	"notebook_path",
	"path",
	"pattern",
	"glob",
];

export const gated = (input: unknown): boolean =>
	isRecord(input) && GATED_KEYS.some((k) => typeof input[k] === "string");

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
	return verdict(
		"ask",
		reason,
		asks.some((v) => v.person) ? { person: true } : {},
	);
};
