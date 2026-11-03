import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";

export interface Written {
	readonly path: string;
	readonly text: string;
}

/** The code rules file: the user's copy, absent when `held` is `undefined`, and the one the plugin ships. */
export interface RulesLab {
	readonly held?: string;
	readonly shipped: string;
}

export const USER_RULES = "/home/u/.claude/rules/claudetto-code.md";

const SHIPPED_RULES = "/rules/claudetto-code.md";

/** A home of `/home/u` whose settings file holds `held`, or is absent when `held` is `undefined`; each path of `others` holds its own text, or is absent at `undefined`. */
export const userSettingsLab = (
	on: On,
	held: string | undefined,
	rules?: RulesLab,
	others: ReadonlyMap<string, string | undefined> = new Map(),
): Written[] => {
	const files: Written[] = [];
	const textAt = (path: string): string | undefined => {
		if (others.has(path)) {
			return others.get(path);
		}
		if (rules === undefined) {
			return held;
		}
		if (path === USER_RULES) {
			return rules.held;
		}
		return path.endsWith(SHIPPED_RULES) ? rules.shipped : held;
	};
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined,
	}));
	on("fs.exists", (_$, e) => ({ value: textAt(e.path) !== undefined }));
	on("fs.read", (_$, e) => {
		const text = textAt(e.path);
		if (text === undefined) {
			throw new Error("no file");
		}
		return { value: text };
	});
	on("fs.write", (_$, e) => {
		files.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	return files;
};

/** The short names that an interactive `session.start` registers. */
export const registeredTools = async (
	$: Engine,
	on: On,
): Promise<readonly string[]> => {
	const names: string[] = [];
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => {
		names.push(e.name);
		return { value: { tool: `mcp__claudetto__${e.name}` } };
	});
	await $.session.start({
		cwd: "/p",
		surface: "terminal",
		isInteractive: true,
	});
	return names;
};
