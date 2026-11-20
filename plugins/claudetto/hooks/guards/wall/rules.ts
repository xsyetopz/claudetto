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

/** Prompts for actions that lose work or end other processes; each one asks, none is blocked. */
export const ASK: readonly string[] = [
	"Bash(git stash*)",
	"Bash(git reset --hard*)",
	"Bash(git clean *)",
	"Bash(git branch -D *)",
	"Bash(git * stash*)",
	"Bash(git * reset --hard*)",
	"Bash(git * clean *)",
	"Bash(git * branch -D *)",
	"Bash(git push --tags*)",
	"Bash(git push * --tags*)",
	"Bash(git push * refs/tags/*)",
	"Bash(pkill *)",
	"Bash(killall *)",
	"Edit(~/.claude/settings.json)",
	"Write(~/.claude/settings.json)"
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

/** Commands that cannot run inside the sandbox (ADR-0159); `claude *` starts its own sandbox (ADR-0188). */
export const EXCLUDED: readonly string[] = [
	"ps *",
	"top *",
	"sysctl *",
	"launchctl list",
	"claude *"
];

/** The walls a user keeps from every session; `~/.claudetto-holdout` holds the held-out eval set (REQ-GUARDS-058). */
export const WALLS: readonly string[] = ["~/.claudetto-holdout"];

/** The `Read` rule path of a wall: `~/` stays, `$HOME` folds to `~`, any other absolute path takes `//`. */
export const wallRule = (wall: string): string => {
	const home = wall.replace(/^\$\{HOME\}|^\$HOME/u, "~");
	return home.startsWith("/") ? `//${home.slice(1)}` : home;
};
