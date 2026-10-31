import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";

export interface Written {
	readonly path: string;
	readonly text: string;
}

/** A home of `/home/u` whose settings file holds `held`, or is absent when `held` is `undefined`. */
export const userSettingsLab = (
	on: On,
	held: string | undefined,
): Written[] => {
	const files: Written[] = [];
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined,
	}));
	on("fs.exists", () => ({ value: held !== undefined }));
	on("fs.read", () => {
		if (held === undefined) {
			throw new Error("no file");
		}
		return { value: held };
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
