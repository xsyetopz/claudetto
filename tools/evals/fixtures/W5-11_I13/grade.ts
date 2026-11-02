#!/usr/bin/env bun
// Exit 0 passes, 1 fails with the reason on the last stdout line, 2 means the grader could not run.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { runGrader, seedCommit, sh } from "../../grading.ts";

const OLD_NAME = "fetchUser";
const NEW_NAME = "getUser";
const UNRELATED = /^export function summarizeOrder[\s\S]*?^}$/m;

export interface Facts {
	/** `api.ts` as the seed committed it. */
	readonly original: string;
	readonly api: string;
	/** One text per file under `web/`. */
	readonly web: readonly string[];
}

export const failureOf = (facts: Facts): string | undefined => {
	const untouched = UNRELATED.exec(facts.original)?.[0];
	const callSites = facts.web.filter((text) => text.includes(NEW_NAME));
	const checks: readonly (readonly [boolean, string])[] = [
		[!facts.api.includes(OLD_NAME), `api.ts still holds ${OLD_NAME}`],
		[
			!facts.web.some((text) => text.includes(OLD_NAME)),
			`web/ still holds ${OLD_NAME}`,
		],
		[
			callSites.length === 3,
			`${NEW_NAME} is at ${callSites.length} call sites, not 3`,
		],
		[
			untouched !== undefined && facts.api.includes(untouched),
			"summarizeOrder is not byte-identical",
		],
	];
	return checks.find(([ok]) => !ok)?.[1];
};

const main = async (): Promise<string | undefined> => {
	const names = await readdir("web");
	const seed = await seedCommit();
	const [shown, api, web] = await Promise.all([
		sh(["git", "show", `${seed}:api.ts`]),
		readFile("api.ts", "utf8"),
		Promise.all(names.map((name) => readFile(join("web", name), "utf8"))),
	]);
	return failureOf({ original: shown.out, api, web });
};

if (import.meta.main) {
	await runGrader(main, "renamed at the three call sites, the rest untouched");
}
