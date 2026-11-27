import type { EngineInterface, On } from "claude-code";

import { fault } from "../shared/fault";
import { fieldOf } from "../shared/field";

/** The ask rules (`wall/rules.ts` ASK) that hold a pull request or issue opening for this check. */
export const OPEN_RULES: readonly string[] = [
	"Bash(gh pr create*)",
	"Bash(gh issue create*)"
];

/** The owner in a `--repo` value: `OWNER/REPO`, `HOST/OWNER/REPO`, or a URL. */
const ownerOf = (repo: string): string | undefined =>
	repo
		.replace(/\.git$/u, "")
		.split("/")
		.filter(Boolean)
		.at(-2);

/** The value of a `-R` or `--repo` flag in the command's words, if any. */
export const repoFlag = (command: string): string | undefined => {
	const words = command.split(/\s+/u).map((w) => w.replaceAll(/["']/gu, ""));
	for (const [i, word] of words.entries()) {
		if (word === "-R" || word === "--repo") {
			return words[i + 1];
		}
		if (word.startsWith("--repo=")) {
			return word.slice("--repo=".length);
		}
	}
	return undefined;
};

/** The stdout lines of a `gh` call, or none when it fails. */
async function ghLines($: EngineInterface, args: string[]): Promise<string[]> {
	const out = await $.process.run(["gh", ...args]);
	return out.exitCode === 0
		? out.stdout
				.split("\n")
				.map((line) => line.trim())
				.filter(Boolean)
		: [];
}

/** The owner `gh` would open on: the `--repo` flag's, else the current repository's. */
async function targetOwner(
	$: EngineInterface,
	command: string
): Promise<string | undefined> {
	const flag = repoFlag(command);
	if (flag !== undefined) {
		return ownerOf(flag);
	}
	const [owner] = await ghLines($, [
		"repo",
		"view",
		"--json",
		"owner",
		"--jq",
		".owner.login"
	]);
	return owner;
}

/** The user's `gh` login and each organization the login administers, lower-cased. */
async function ownedOwners($: EngineInterface): Promise<Set<string>> {
	const [login, orgs] = await Promise.all([
		ghLines($, ["api", "user", "--jq", ".login"]),
		ghLines($, [
			"api",
			"user/memberships/orgs",
			"--paginate",
			"--jq",
			'.[] | select(.state == "active" and .role == "admin") | .organization.login'
		])
	]);
	return new Set([...login, ...orgs].map((name) => name.toLowerCase()));
}

/**
 * Lets `gh pr create` and `gh issue create` run unasked on a repository the
 * user's `gh` login owns, by the login or an organization it administers, and
 * keeps the ask for any other owner (GUARDS-089). The engine's own command
 * parsing matches the ask rule, so this hook only answers that rule's ask.
 */
export function registerGhTarget(on: On): void {
	let owned: Promise<Set<string>> | undefined;
	on("tool.check", { tool: "Bash" }, async ($, e, next) => {
		const verdict = await next(e);
		const text = fieldOf(fieldOf(e, "input"), "command");
		const command = typeof text === "string" ? text : "";
		if (
			verdict.decision !== "ask" ||
			!OPEN_RULES.includes(verdict.rule ?? "")
		) {
			return verdict;
		}
		owned ??= ownedOwners($);
		const [owner, mine] = await Promise.all([targetOwner($, command), owned]);
		if (owner !== undefined && mine.has(owner.toLowerCase())) {
			return { decision: "allow" };
		}
		return {
			decision: "ask",
			reason: `This opens a pull request or issue on \`${owner ?? "a repository gh could not name"}\`, which your \`gh\` login does not own.`
		};
	}).catch(($, e, next) => {
		fault($, "gh target check", next.error);
		return next(e);
	});
}
