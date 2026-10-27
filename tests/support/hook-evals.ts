// The hook evals of each plugin (`wiki/claudetto/development/Plugin-Layout.md`).
// `evals/hooks.json` of a plugin names each hook by its id, the hook-lab test of each case kind, and the model requests and tokens that the hook adds to each turn.
// A hook in a hooks module has its rule name in a `// rule: <module>.<job>` comment on the line above its `on(` call (D3 of change `redesign-0-4-0`).
// A call that joins several hooks has one such comment for each hook, in the lines above it.
// A classic hook has the id `<event> <command>`, with the plugin root and the `bun` launcher removed, or `<event> prompt`.

import path from "node:path";
import { file as bunFile } from "bun";

const ON_CALL = /^\s*on\(\s*(?:"|$)/;
const RULE_COMMENT = /^\s*\/\/ rule: (.+)$/;
const BUN_LAUNCHER = /^bun(?: --no-env-file)? /;
const GRADERS_HEADER = /^graders:\s*$/m;

/** Whether the file `full` exists. */
const exists = (full: string): Promise<boolean> => bunFile(full).exists();

/**
 * One hook eval entry of `evals/hooks.json`. A test is `<file from the repository root> > <test name>`.
 * A hook that runs a model has its cases in `claude plugin eval`, and a case is `<path of its case.yaml> > <grader name>`.
 */
/** One test, or a list of tests, of a case kind. */
type Ref = string | string[];

export interface Entry {
	requests: number;
	tokens: number;
	blocks: boolean;
	allow: Ref;
	text: Ref;
	block?: Ref;
	false?: Ref;
	eval?: string;
}

/** The `on(` calls of the hooks module files, each with its id or a fault. `files` maps a path to its text. */
export const moduleHooks = (
	files: Record<string, string>,
): {
	ids: string[];
	faults: string[];
} => {
	const ids: string[] = [];
	const faults: string[] = [];
	for (const [file, text] of Object.entries(files)) {
		const lines = text.split("\n");
		lines.forEach((line, i) => {
			if (!ON_CALL.test(line)) {
				return;
			}
			// A call of joined handlers has one `// rule:` line for each handler, in a block above it.
			const above: string[] = [];
			for (let j = i - 1; j >= 0; j--) {
				const id = RULE_COMMENT.exec(lines[j] ?? "")?.[1]?.trim();
				if (!id) {
					break;
				}
				above.unshift(id);
			}
			if (above.length > 0) {
				ids.push(...above);
			} else {
				faults.push(
					`${file}:${i + 1}: an \`on(\` call has no \`// rule:\` comment above it`,
				);
			}
		});
	}
	return { ids, faults };
};

/** The ids of the classic hooks of a parsed `hooks.json`. */
export const classicHooks = (json: {
	hooks?: Record<string, { hooks: { type: string; command?: string }[] }[]>;
}): string[] => {
	const ids = new Set<string>();
	for (const [event, groups] of Object.entries(json.hooks ?? {})) {
		for (const group of groups) {
			for (const hook of group.hooks) {
				if (hook.type !== "command") {
					ids.add(`${event} ${hook.type}`);
					continue;
				}
				const command = (hook.command ?? "")
					.replace(BUN_LAUNCHER, "")
					.replace(/"\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]*)"/g, "$1");
				ids.add(`${event} ${command}`);
			}
		}
	}
	return [...ids];
};

/** The grader names of a `claude plugin eval` case file. */
export const graderNames = (text: string): Set<string> => {
	const graders = text.split(GRADERS_HEADER)[1] ?? "";
	return new Set(
		[...graders.matchAll(/^\s+name:\s*"?([^"\n]+?)"?\s*$/gm)].map(
			(m) => m[1] ?? "",
		),
	);
};

/** The names of the `test(` calls in a test file, from a string literal, with line comments before the name skipped. */
export const testNames = (text: string): Set<string> => {
	const names = new Set<string>();
	for (const m of text.matchAll(
		/\btest\((?:\s|\/\/[^\n]*\n)*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g,
	)) {
		names.add((m[2] ?? "").replace(/\\(.)/g, "$1"));
	}
	return names;
};

/** The kinds of test that an entry names. A blocking hook also names a block case and a false-block case. */
const kinds = (entry: Entry): (keyof Entry)[] =>
	entry.blocks ? ["allow", "text", "block", "false"] : ["allow", "text"];

/** The fault of the test reference `ref` of the case kind `kind`, or none. */
const refFault = async (
	root: string,
	plugin: string,
	id: string,
	kind: keyof Entry,
	ref: unknown,
): Promise<string[]> => {
	const [file, name] = typeof ref === "string" ? ref.split(" > ", 2) : [];
	if (!file || !name) {
		return [`${plugin}: the hook \`${id}\` names no \`${kind}\` test`];
	}
	const full = path.join(root, ...file.split("/"));
	const text = (await exists(full)) ? await bunFile(full).text() : "";
	const names = file.endsWith("case.yaml")
		? graderNames(text)
		: testNames(text);
	return names.has(name)
		? []
		: [
				`${plugin}: the \`${kind}\` test of the hook \`${id}\` is not in ${file}: ${name}`,
			];
};

// The faults of one manifest entry `entry` of the hook `id`.
const entryFaults = async (
	root: string,
	plugin: string,
	id: string,
	entry: Entry,
): Promise<string[]> => {
	const faults: string[] = [];
	if (!(entry.requests >= 0 && entry.tokens >= 0)) {
		faults.push(
			`${plugin}: the hook \`${id}\` records no \`requests\` and \`tokens\` for each turn`,
		);
	}
	const refFaults = await Promise.all(
		kinds(entry).flatMap((kind) => {
			const refs = [entry[kind]].flat();
			// An empty list names no test, so it is checked as a missing one.
			return (refs.length > 0 ? refs : [undefined]).map((ref) =>
				refFault(root, plugin, id, kind, ref),
			);
		}),
	);
	faults.push(...refFaults.flat());
	if (entry.requests > 0) {
		const dir = path.join(root, "plugins", plugin, "evals", entry.eval ?? "");
		if (!entry.eval || !(await exists(path.join(dir, "case.yaml")))) {
			faults.push(
				`${plugin}: the hook \`${id}\` adds a model request and names no \`claude plugin eval\` case`,
			);
		}
	}
	return faults;
};

/**
 * The faults of the hook evals of the plugin `plugin` under `root`, each naming the hook.
 * `hooks` are the ids that the code of the plugin has.
 */
export const evalFaults = async (
	root: string,
	plugin: string,
	hooks: string[],
): Promise<string[]> => {
	const file = path.join(root, "plugins", plugin, "evals", "hooks.json");
	const manifest: Record<string, Entry> = (await exists(file))
		? JSON.parse(await bunFile(file).text())
		: {};
	const faults: string[] = [];
	for (const id of hooks) {
		if (!manifest[id]) {
			faults.push(
				`${plugin}: the hook \`${id}\` has no entry in \`evals/hooks.json\``,
			);
		}
	}
	const entryResults = await Promise.all(
		Object.entries(manifest).map(([id, entry]) =>
			hooks.includes(id)
				? entryFaults(root, plugin, id, entry)
				: [
						`${plugin}: \`evals/hooks.json\` names \`${id}\`, which is not a hook of the plugin`,
					],
		),
	);
	faults.push(...entryResults.flat());
	return faults;
};
