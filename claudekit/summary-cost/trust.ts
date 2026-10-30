import { homedir } from "node:os";
import path from "node:path";
import { objectOf, parsedOf } from "./json.ts";
import { underLock } from "./lock.ts";

export const configPath = (): string => path.join(homedir(), ".claude.json");

/** `dir` must be the real path: macOS reports `/tmp/x` as `/private/tmp/x`. */
export const withTrust = (config: string, dir: string): string => {
	const parsed = parsedOf(config);
	const projects = objectOf(parsed["projects"]);
	return JSON.stringify({
		...parsed,
		projects: {
			...projects,
			[dir]: { ...objectOf(projects[dir]), hasTrustDialogAccepted: true },
		},
	});
};

export const withoutTrust = (config: string, dir: string): string => {
	const parsed = parsedOf(config);
	const kept = Object.fromEntries(
		Object.entries(objectOf(parsed["projects"])).filter(
			([key]) => key !== dir && !key.startsWith(`${dir}/`),
		),
	);
	return JSON.stringify({ ...parsed, projects: kept });
};

// Under the lock, because an unlocked read-modify-write drops a concurrent writer's changes.
const change = (
	file: string,
	dir: string,
	edit: (config: string, dir: string) => string,
): Promise<void> => underLock(file, (before) => edit(before, dir));

export const trust = (file: string, dir: string): Promise<void> =>
	change(file, dir, withTrust);

export const untrust = (file: string, dir: string): Promise<void> =>
	change(file, dir, withoutTrust);
