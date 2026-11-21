import { isRecord, type Json } from "../../settings/settings";
import { FREE, GUARDED } from "./rules";

/** A `*` that no backslash escapes. */
const WILDCARD = /(?<!\\)\*/u;

/** The text between the parentheses of a `Bash(...)` rule, else undefined. */
const bashPattern = (rule: unknown): string | undefined =>
	typeof rule === "string" ? /^Bash\((.+)\)$/su.exec(rule)?.[1] : undefined;

/** One literal run of a pattern as regex source: `\*` is a star, every other character is itself. */
const literal = (run: string): string =>
	run
		.replaceAll(String.raw`\*`, "*")
		.replaceAll(/[$()+.?[\\\]^{|}*]/gu, String.raw`\$&`);

const wholeMatch = (pattern: string, command: string): boolean => {
	const source = pattern
		.split(WILDCARD)
		.map((run) => literal(run))
		.join(".*");
	return new RegExp(`^${source}$`, "su").test(command);
};

/**
 * Whether a `Bash(...)` rule pattern matches a whole command, as the permission
 * rules page defines it (configure/permissions/rules): `*` matches any run of
 * characters and `\*` a literal star. A pattern ending in a space and one star
 * also matches the bare command, and the legacy `:*` suffix matches a prefix.
 *
 * @param pattern The text between the parentheses of a `Bash(...)` rule.
 * @param command The command to test.
 * @returns True when the rule applies to the command.
 */
export const matchesPattern = (pattern: string, command: string): boolean => {
	if (pattern.endsWith(":*")) {
		return command.startsWith(pattern.slice(0, -2));
	}
	return (
		wholeMatch(pattern, command) ||
		(pattern.endsWith(" *") && wholeMatch(pattern.slice(0, -2), command))
	);
};

const matchesAny = (
	rule: unknown,
	probes: readonly { readonly command: string }[]
): boolean => {
	const pattern = bashPattern(rule);
	return (
		pattern !== undefined &&
		probes.some((probe) => matchesPattern(pattern, probe.command))
	);
};

/** Whether an ask or deny rule would stop a command claudetto keeps free. */
export const blocksFree = (rule: unknown): boolean => matchesAny(rule, FREE);

/** Whether an allow rule would let through a command claudetto guards. */
export const allowsGuarded = (rule: unknown): boolean =>
	matchesAny(rule, GUARDED);

const CONFLICTS: readonly (readonly [string, (rule: unknown) => boolean])[] = [
	["allow", allowsGuarded],
	["ask", blocksFree],
	["deny", blocksFree]
];

/**
 * Removes from `next.permissions` each rule that conflicts with the
 * construction, wherever it came from: a rule an earlier release wrote and a
 * rule the user wrote are judged by what they match, not by who wrote them.
 *
 * @param next Settings being built; its permission lists are replaced.
 * @param removed Receives one `removed permissions.<list> <rule>` line per removal.
 */
export function dropConflicts(next: Json, removed: string[]): void {
	const permissions = next["permissions"];
	if (!isRecord(permissions)) {
		return;
	}
	for (const [list, conflicts] of CONFLICTS) {
		const held: unknown = permissions[list];
		if (!Array.isArray(held)) {
			continue;
		}
		const entries: unknown[] = held;
		const dropped = entries.filter((rule) => conflicts(rule));
		if (dropped.length > 0) {
			permissions[list] = entries.filter((rule) => !conflicts(rule));
			removed.push(
				...dropped.map((rule) => `removed permissions.${list} ${String(rule)}`)
			);
		}
	}
}
