import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { YAML } from "bun";

/** The folder the setup skill copies into `~/.claude/rules/`. */
export const RULE_ROOT = "rules";

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n/;

/** The scope of one rule file: its name, the globs of its `paths` key, and the fault when the key is unusable. */
export interface RuleScope {
	readonly name: string;
	/** The globs of the `paths` key, which decide when the harness loads the rule. */
	readonly paths: readonly string[];
	/** Why the file has no usable scope, when it has none. */
	readonly fault?: string;
}

const isMapping = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const pathsOf = (value: unknown): readonly string[] | string => {
	if (typeof value === "string") {
		return value
			.split(",")
			.map((glob) => glob.trim())
			.filter((glob) => glob !== "");
	}
	if (!Array.isArray(value)) {
		return `the \`paths\` key is a ${typeof value}, and the harness takes a list or a comma string`;
	}
	const globs = value.filter(
		(glob): glob is string => typeof glob === "string" && glob.trim() !== "",
	);
	return globs.length === value.length
		? globs
		: "the `paths` list holds an entry that is not a glob";
};

/**
 * The scope of one rule file. The harness reads only the `paths` key, and bad YAML loads the rule
 * without it, which turns a scoped rule into one that every session carries.
 */
export const scopeOf = (name: string, text: string): RuleScope => {
	const head = FRONT_MATTER.exec(text);
	if (head?.[1] === undefined) {
		return { name, paths: [], fault: "the file has no front matter" };
	}
	let front: unknown;
	try {
		front = YAML.parse(head[1]);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		return {
			name,
			paths: [],
			fault: `the front matter is not YAML: ${reason}`,
		};
	}
	if (!isMapping(front)) {
		return { name, paths: [], fault: "the front matter is not a mapping" };
	}
	const value = front["paths"];
	if (value === undefined) {
		return { name, paths: [], fault: "the file names no `paths` key" };
	}
	const globs = pathsOf(value);
	return typeof globs === "string"
		? { name, paths: [], fault: globs }
		: { name, paths: globs };
};

/** The scope of each rule file of `root`. */
export const readScopes = async (
	root = RULE_ROOT,
): Promise<readonly RuleScope[]> => {
	const names = (await readdir(root)).filter((name) => name.endsWith(".md"));
	return await Promise.all(
		names.sort().map(async (name) => {
			const text = await readFile(join(root, name), "utf8");
			return scopeOf(name, text);
		}),
	);
};

/** The faults of a set of rule files, one line per file that would load unscoped. */
export const scopeFaults = (scopes: readonly RuleScope[]): readonly string[] =>
	scopes
		.filter((scope) => scope.fault !== undefined || scope.paths.length === 0)
		.map(
			(scope) =>
				`${scope.name}: ${scope.fault ?? "the `paths` key holds no glob"}`,
		);
