// The checks of a `sandbox` snippet that may not ship. A fault is reported, never repaired, so the
// writer cannot hide a loss by fixing it quietly.

import {
	isWithin,
	normalizePath,
	type SandboxSnippet,
	SECRET_PATHS,
	sandboxSupported,
} from "./sandbox.ts";

/** The five ways a `sandbox` snippet loses protection: the sandbox off, unsandboxed commands allowed, `denyRead` missing a secret path, `allowRead` re-opening one, or `excludedCommands` running a program that reads one. */
export type SandboxFaultRule =
	| "sandbox-off"
	| "unsandboxed-allowed"
	| "deny-read-missing"
	| "allow-read-reopens"
	| "excluded-reopens";

/** One finding of the sandbox checks; it is reported and never repaired. */
export interface SandboxFault {
	readonly rule: SandboxFaultRule;
	/** The key, path, or command the fault is in. */
	readonly where: string;
}

/**
 * Programs whose job is to read a secret path, so a command in `excludedCommands` that starts with
 * one runs outside the sandbox and reads it past `denyRead`. The route says `excludedCommands` is
 * "a convenience, not a boundary". The mapping is what each tool is documented to read:
 * `~/.ssh` for the `ssh` family, `~/.gnupg` for `gpg`, `~/.aws/credentials` for `aws`,
 * `~/.docker/config.json` for `docker`, `~/.netrc` for `ftp`.
 */
const READERS: Readonly<Record<string, string>> = {
	ssh: "~/.ssh",
	scp: "~/.ssh",
	sftp: "~/.ssh",
	"ssh-add": "~/.ssh",
	"ssh-keygen": "~/.ssh",
	gpg: "~/.gnupg",
	gpg2: "~/.gnupg",
	aws: "~/.aws/credentials",
	docker: "~/.docker/config.json",
	ftp: "~/.netrc",
};

/** Programs that read any file they are given, which re-opens every secret path. */
const ANY_FILE = new Set(["cat", "less", "more", "head", "tail", "cp", "grep"]);

const WHITESPACE = /\s+/;

const WILDCARD_ONLY = /^:?\*$/;

/** The program of a pattern such as `docker:*` or `ssh host`, which is its first word. */
const programOf = (pattern: string): string => {
	const first = pattern.trim().split(WHITESPACE)[0] ?? "";
	const colon = first.indexOf(":");
	return colon === -1 ? first : first.slice(0, colon);
};

/** True when the excluded command runs a reader of a secret path or names a secret path. */
export const reopensSecret = (pattern: string): boolean => {
	const program = programOf(pattern);
	if (WILDCARD_ONLY.test(pattern.trim()) || ANY_FILE.has(program)) {
		return true;
	}
	if (program in READERS) {
		return true;
	}
	return SECRET_PATHS.some((secret) => pattern.includes(normalizePath(secret)));
};

const offFaults = (
	snippet: SandboxSnippet,
	platform: string,
): readonly SandboxFault[] =>
	sandboxSupported(platform) && snippet.sandbox.enabled !== true
		? [{ rule: "sandbox-off", where: "sandbox.enabled" }]
		: [];

const unsandboxedFaults = (snippet: SandboxSnippet): readonly SandboxFault[] =>
	snippet.sandbox.allowUnsandboxedCommands === false
		? []
		: [
				{
					rule: "unsandboxed-allowed",
					where: "sandbox.allowUnsandboxedCommands",
				},
			];

const missingFaults = (snippet: SandboxSnippet): readonly SandboxFault[] =>
	SECRET_PATHS.filter(
		(secret) =>
			!snippet.sandbox.filesystem.denyRead.some((entry) =>
				isWithin(secret, entry),
			),
	).map((where): SandboxFault => ({ rule: "deny-read-missing", where }));

/** An `allowRead` entry re-opens a secret path when either one lies within the other. */
const allowFaults = (snippet: SandboxSnippet): readonly SandboxFault[] =>
	(snippet.sandbox.filesystem.allowRead ?? [])
		.filter((entry) =>
			SECRET_PATHS.some(
				(secret) => isWithin(secret, entry) || isWithin(entry, secret),
			),
		)
		.map((where): SandboxFault => ({ rule: "allow-read-reopens", where }));

const excludedFaults = (snippet: SandboxSnippet): readonly SandboxFault[] =>
	(snippet.sandbox.excludedCommands ?? [])
		.filter(reopensSecret)
		.map((where): SandboxFault => ({ rule: "excluded-reopens", where }));

/** Every fault of a snippet. An empty list is a snippet that may be written. */
export const sandboxFaults = (
	snippet: SandboxSnippet,
	platform: string = process.platform,
): readonly SandboxFault[] => [
	...offFaults(snippet, platform),
	...unsandboxedFaults(snippet),
	...missingFaults(snippet),
	...allowFaults(snippet),
	...excludedFaults(snippet),
];
