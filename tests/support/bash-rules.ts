// The matching of a `Bash(...)` permission rule, as the `Ene` function of Claude Code 2.1.302 does it:
// a rule with `*` is anchored `^...$` with the `s` flag, `*` is `.*`, a trailing ` *` is `( .*)?`, and repeated spaces collapse.
// A deny or ask rule tests the whole command, and then each subcommand of the shell parse, which knows quotes.
// A prefix `VAR=x`, `sudo`, `env`, `timeout`, `nice`, `nohup`, and `command` is stripped before the test.
// A program by path, `sh -c`, and an option before the subcommand are out of scope, because a rule cannot match them.

/** The index after a separator at `i`: a doubled `&&` or `||` counts as one separator. */
const separatorEnd = (command: string, i: number): number => {
	const ch = command.charAt(i);
	return (ch === "&" || ch === "|") && command[i + 1] === ch ? i + 1 : i;
};

/** The subcommands of a compound command: split on `&&`, `||`, `;`, `|`, `&`, and a newline, outside quotes. */
export const subcommands = (command: string): string[] => {
	const parts: string[] = [];
	let part = "";
	let quote = "";
	for (let i = 0; i < command.length; i++) {
		const ch = command.charAt(i);
		if (!quote && ";|&\n".includes(ch)) {
			parts.push(part);
			part = "";
			i = separatorEnd(command, i);
			continue;
		}
		if (quote) {
			if (ch === quote) {
				quote = "";
			}
		} else if (ch === '"' || ch === "'") {
			quote = ch;
		}
		part += ch;
	}
	parts.push(part);
	return parts.map((p) => p.trim()).filter(Boolean);
};

const PREFIX =
	/^(?:[A-Za-z_]\w*=\S*|sudo|env|timeout(?: \d+\S*)?|nice|nohup|command)\s+/;
const stripPrefix = (part: string): string => {
	let rest = part;
	while (PREFIX.test(rest)) {
		rest = rest.replace(PREFIX, "");
	}
	return rest;
};

const BASH_RULE = /^Bash\((.*)\)$/s;

/** The pattern of a `Bash(pattern)` rule, or `null` for another tool. */
export const bashPattern = (rule: string): string | null =>
	BASH_RULE.exec(rule)?.[1] ?? null;

/** Claude Code reads `*` before a trailing `:*` as part of a literal prefix, so the rule has no wildcard (the warning "mixes * with the trailing :* prefix syntax"). */
export const mixesStarWithPrefix = (pattern: string): boolean =>
	pattern.endsWith(":*") && pattern.slice(0, -2).includes("*");

const regexOf = (pattern: string): RegExp => {
	if (mixesStarWithPrefix(pattern)) {
		return new RegExp(
			`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
			"s",
		);
	}
	const trailing = pattern.endsWith(" *");
	const body = trailing ? pattern.slice(0, -2) : pattern;
	const source = body
		.split("*")
		.map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
		.join(".*");
	return new RegExp(`^${source}${trailing ? "( .*)?" : ""}$`, "s");
};

/** The rules that match the command: a rule matches the whole command or one subcommand. */
export const matchingRules = (rules: string[], command: string): string[] => {
	const parts = [command, ...subcommands(command)].map((p) =>
		stripPrefix(p.trim()).replace(/ +/g, " "),
	);
	return rules.filter((rule) => {
		const pattern = bashPattern(rule);
		if (pattern === null) {
			return false;
		}
		const re = regexOf(pattern);
		return parts.some((part) => re.test(part));
	});
};
