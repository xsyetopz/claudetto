import { OPEN_RULES } from "../target";

/**
 * Permission rules and sandbox lists that setup fills into user settings
 * (ADR-0125, ADR-0159, ADR-0188, ADR-0190). Claude Code enforces them, so no hook
 * judges a command. Measured on 2.1.327 (fake-API probe, 2026-11-18): vanilla runs
 * `cat .env`, `grep -c KEY .env` and `git push --force`; with these rules and the
 * sandbox on, the first two fail with "Operation not permitted" and the third is
 * denied, also inside `a && git push --force`.
 */

/** Credential files; `Read` deny rules also become sandbox `denyRead` paths while the sandbox is on. */
export const CREDENTIALS: readonly string[] = [
	"~/.aws/**",
	"~/.azure/**",
	"~/.config/gcloud/**",
	"~/.netrc",
	"~/.git-credentials",
	"~/Library/Keychains/**"
];

/** Env files hold secrets; `.env.example` and `.env.sample` stay readable. */
export const ENV_FILES: readonly string[] = [
	"**/.env",
	"**/.env.local",
	"**/.env.development",
	"**/.env.production",
	"**/.env.staging",
	"**/.env.test"
];

export const DENY: readonly string[] = [
	...ENV_FILES.map((path) => `Read(${path})`),
	...CREDENTIALS.map((path) => `Read(${path})`),
	// The middle wildcards catch `git -C dir push --force` and a flag after the remote, which a prefix rule misses (RISK-103).
	"Bash(git push --force*)",
	"Bash(git *push* --force*)",
	"Bash(git push -f*)",
	"Bash(git *push* -f)",
	"Bash(git *push* -f *)",
	// A hooks override makes a check pass without the repo's hooks (RISK-467); git config keys ignore case.
	"Bash(git config *core.*ooks*ath*)",
	"Bash(git *-c core.*ooks*ath*)"
];

/**
 * The only prompts claudetto adds: a pull request or issue opening, which `target.ts` lets
 * through when the user's `gh` login owns the target. Every other command runs at the agent's
 * will, because an ask rule turns into a denial under dontAsk and the agent then cannot do what
 * the user asked (GUARDS-089).
 */
export const ASK: readonly string[] = [...OPEN_RULES];

/**
 * Non-Bash rules claudetto keeps free of an ask or deny; an earlier release wrote this one, and
 * a list entry is not taken back the way a recorded key is.
 */
export const FREE_RULES: readonly string[] = ["Edit(~/.claude/settings.json)"];

/** A command named with the reason it belongs on its list. */
export interface Probe {
	readonly command: string;
	readonly why: string;
}

/**
 * Commands claudetto keeps free of a prompt. An ask or deny rule that matches one
 * is removed from user settings, so a rule an earlier release wrote and a later
 * one narrowed stops prompting without a list of retired rules.
 */
export const FREE: readonly Probe[] = [
	{ command: "git stash", why: "saving keeps the work in the stash list" },
	{ command: "git stash list", why: "listing only reads" },
	{ command: "git stash show", why: "showing only reads" },
	{ command: "git stash --help", why: "help only reads" },
	{
		command: "git stash push -m x",
		why: "pushing keeps the work in the stash list"
	},
	{
		command: "git -C repo stash",
		why: "a -C directory does not change what a save does"
	},
	{
		command: "git -C repo stash list",
		why: "a -C directory does not change what a list does"
	},
	{
		command: "git status && git stash list",
		why: "a read inside a compound command stays a read"
	},
	{ command: "git push origin main", why: "a plain push loses no history" },
	{ command: "git stash clear", why: "the agent clears what the task asks" },
	{
		command: "git -C repo stash clear",
		why: "a -C directory does not change what a clear does"
	},
	{ command: "git reset --hard", why: "the agent resets what the task asks" },
	{
		command: "git -C repo reset --hard",
		why: "a -C directory does not change what a reset does"
	},
	{ command: "git clean -fd", why: "the agent cleans what the task asks" },
	{
		command: "git -C repo clean -fd",
		why: "a -C directory does not change what a clean does"
	},
	{ command: "git branch -D x", why: "the agent deletes branches it made" },
	{ command: "git push --tags", why: "a tag push the task asks for runs" },
	{
		command: "git push origin --tags",
		why: "a tag push the task asks for runs"
	},
	{
		command: "git push origin refs/tags/v1",
		why: "a tag push the task asks for runs"
	},
	{ command: "gh release create v1", why: "a release the task asks for runs" },
	{
		command: "gh release upload v1 a.zip",
		why: "a release the task asks for runs"
	},
	{
		command: "gh release edit v1 --draft=false",
		why: "a release the task asks for runs"
	},
	{ command: "pkill x", why: "the agent stops processes it started" },
	{ command: "killall x", why: "the agent stops processes it started" }
];

/**
 * Commands claudetto guards: one per ask or deny rule, plus the paid `claude -p`
 * run. An allow rule that matches one is removed from user settings, because an
 * allow would let it run with no prompt.
 */
export const GUARDED: readonly Probe[] = [
	{
		command: "gh pr create --title x --body y",
		why: "opens a pull request, which asks unless the gh login owns the target"
	},
	{
		command: "gh issue create --title x --body y",
		why: "opens an issue, which asks unless the gh login owns the target"
	},
	{ command: "git push --force", why: "rewrites remote history" },
	{
		command: "git push origin --force",
		why: "a flag after the remote still rewrites history"
	},
	{
		command: "git -C repo push --force origin",
		why: "a -C directory does not change what a force push does"
	},
	{ command: "git push -f", why: "the short flag rewrites remote history" },
	{
		command: "git push -f origin",
		why: "the short flag rewrites remote history"
	},
	{
		command: "git -C repo push origin -f",
		why: "a trailing short flag rewrites remote history"
	},
	{
		command: "git config core.hooksPath x",
		why: "a hooks override skips the repo's checks"
	},
	{
		command: "git -c core.hooksPath=x commit",
		why: "a one-off hooks override skips the repo's checks"
	},
	{
		command: "claude -p x",
		why: "a headless run is paid, so it stays behind the prompt"
	}
];

/** Files that run later, plus plugin and hook folders: a sandboxed shell may not write them (ADR-0159, RISK-091). */
export const DENY_WRITE: readonly string[] = [
	"~/.zshrc",
	"~/.zshenv",
	"~/.zprofile",
	"~/.bashrc",
	"~/.bash_profile",
	"~/.profile",
	"~/.config/fish",
	"~/.gitconfig",
	"~/.config/git",
	"~/.ssh",
	"~/Library/LaunchAgents",
	"~/.local/bin",
	"~/.bun/bin",
	"~/bin",
	"~/.claude/plugins",
	"~/.claude/hooks",
	"/private/var/folders/**/xcrun_db*"
];

export const DENY_READ: readonly string[] = [
	"~/Library/Keychains",
	"~/.aws",
	"~/.azure",
	"~/.config/gcloud",
	"~/.netrc",
	"~/.git-credentials"
];

export const ALLOW_WRITE: readonly string[] = [
	"~/",
	"/Volumes/",
	"/private/tmp",
	"/opt/homebrew",
	"/private/var/folders"
];

/** Commands that cannot run inside the sandbox (ADR-0159); `claude *` starts its own sandbox (ADR-0188); `git worktree` writes the read-only `.git/worktrees`. */
export const EXCLUDED: readonly string[] = [
	"ps *",
	"top *",
	"sysctl *",
	"launchctl list",
	"claude *",
	"git worktree *"
];

/** The walls a user keeps from every session; `~/.claudetto-holdout` holds the held-out eval set (GUARDS-058). */
export const WALLS: readonly string[] = ["~/.claudetto-holdout"];

/** The `Read` rule path of a wall: `~/` stays, `$HOME` folds to `~`, any other absolute path takes `//`. */
export const wallRule = (wall: string): string => {
	const home = wall.replace(/^\$\{HOME\}|^\$HOME/u, "~");
	return home.startsWith("/") ? `//${home.slice(1)}` : home;
};
