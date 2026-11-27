import type { EngineInterface } from "claude-code";

/** `gh run list --commit` or `-c` with an abbreviated SHA, which matches no run: gh compares the full SHA. */
const SHORT_COMMIT =
	/(\bgh\s+run\s+list\b[^|;&\n]*?\s(?:--commit|-c)(?:=|\s+))([0-9a-f]{7,39})(?![0-9a-f])/giu;

const FULL_SHA = /^[0-9a-f]{40}$/u;

/**
 * Writes each short SHA after `gh run list --commit` in full (GUARDS-090), so the filter finds
 * that commit's runs; a SHA git does not resolve to a commit stays as written.
 * git runs here rather than in the command, which keeps the command plain.
 *
 * @param $ The engine, for the `git rev-parse` call.
 * @param command The Bash command as the model wrote it.
 * @returns The command with full SHAs.
 */
export async function fullCommits(
	$: EngineInterface,
	command: string
): Promise<string> {
	const shorts = new Set(
		[...command.matchAll(SHORT_COMMIT)].map((found) => found[2] ?? "")
	);
	const resolved = await Promise.all(
		[...shorts].map(async (sha) => {
			const r = await $.process.run([
				"git",
				"rev-parse",
				"--verify",
				"--quiet",
				`${sha}^{commit}`
			]);
			const text = r.stdout.trim();
			return r.exitCode === 0 && FULL_SHA.test(text)
				? ([[sha, text]] as const)
				: [];
		})
	);
	const full = new Map<string, string>(resolved.flat());
	return full.size === 0
		? command
		: command.replaceAll(SHORT_COMMIT, (all, head: string, sha: string) => {
				const found = full.get(sha);
				return found === undefined ? all : `${head}${found}`;
			});
}
