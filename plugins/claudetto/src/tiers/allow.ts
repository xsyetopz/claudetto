// The `permissions.allow` list setup writes, and the checks that keep a broad or a flag-open rule out.

/**
 * The allow rules setup writes: read-only `git`, which `README.md` already requires and which is the
 * same on any machine. `git branch` is left out because it creates, renames, and deletes branches,
 * and a package manager, an interpreter, and a test runner are left out because each runs code.
 * None of the four verbs is a finding of the gate in `../gate/findings/git.ts`, so the settings and
 * the gate do not contradict each other.
 *
 * Only `git status` takes the wildcard form `Bash(git status *)`, which "also matches the bare
 * command" (`configure/permissions/rules`, `2.1.314`). The other three are the bare form, which
 * holds no `*` and so matches that text alone, because `git diff`, `git log`, and `git show` each
 * take `--output=<file>` and write that file: run in this checkout, `git diff --output=F HEAD~1`,
 * `git log -1 --output=F`, and `git show --output=F HEAD` each exited `0` and left `F` on disk,
 * where `git status --output=F` exited `129` and wrote nothing. A wildcard rule for the three would
 * therefore pre-approve an arbitrary file write, which is not the read-only permission this list
 * claims to grant. The cost of the bare form is a prompt for a `git diff` that carries arguments.
 */
export const ALLOW_RULES: readonly string[] = [
	"Bash(git status *)",
	"Bash(git diff)",
	"Bash(git log)",
	"Bash(git show)",
];

/**
 * The commands that may carry a wildcard, because each rejects every flag that writes a file.
 *
 * A command belongs here only after it has been run with the flag and seen to refuse it, as the
 * exit statuses in `ALLOW_RULES` above record for `git status`.
 */
const NO_WRITE_FLAG: readonly string[] = ["git status"];

const RULE = /^([^(]*?)(?:\((.*)\))?$/s;
const ONLY_WILDCARDS = /^[*\s]*$/;
const SPACES = /\s+/;
const WILDCARD_TAIL = /[\s*]*\*[\s*]*$/;

/**
 * The rules in `rules` that are broad: a tool named with no content such as `Bash`, content of only
 * wildcards such as `Bash(*)`, or a `Bash` rule with a wildcard inside its first word such as
 * `Bash(python*)`. Such a rule pre-approves a whole tool or interpreter and not one command, so
 * what it allows is whatever that program is later asked to run. Only a `Bash` rule is read by
 * its first word, because the content of another tool is a path or a domain and not a command.
 */
export const broadRules = (rules: readonly string[]): readonly string[] =>
	rules.filter((rule) => {
		const [, tool = "", content] = RULE.exec(rule.trim()) ?? [];
		if (content === undefined || ONLY_WILDCARDS.test(content)) {
			return true;
		}
		return (
			tool === "Bash" && (content.trim().split(SPACES)[0] ?? "").includes("*")
		);
	});

/**
 * The `Bash` rules in `rules` that let a call add its own arguments to a command that is not in
 * `NO_WRITE_FLAG`, such as `Bash(git diff *)`.
 *
 * A rule cannot exclude a flag, so a wildcard over a command that writes with a flag pre-approves
 * that write. This leaves the rule to name the command alone, or the command to be one that
 * refuses such a flag.
 */
export const flagOpenRules = (rules: readonly string[]): readonly string[] =>
	rules.filter((rule) => {
		const [, tool = "", content] = RULE.exec(rule.trim()) ?? [];
		if (tool !== "Bash" || content === undefined || !content.includes("*")) {
			return false;
		}
		return !NO_WRITE_FLAG.includes(content.replace(WILDCARD_TAIL, "").trim());
	});

/**
 * One line of reason for each rule of `rules` that setup refuses to write, broad rules first.
 *
 * A rule that both checks catch is named once, by the first reason, because two lines about one
 * rule read as two faults.
 */
export const ruleFaults = (rules: readonly string[]): readonly string[] => {
	const broad = broadRules(rules);
	return [
		...broad.map((rule) => `broad allow rule \`${rule}\``),
		...flagOpenRules(rules)
			.filter((rule) => !broad.includes(rule))
			.map((rule) => `allow rule \`${rule}\` admits a file-writing flag`),
	];
};
