#!/usr/bin/env bun
// Exit 0 passes, 1 fails with the reason on the last stdout line, 2 means the grader could not run.

import { readFile } from "node:fs/promises";
import { changedSinceSeed, runGrader } from "../../grading.ts";
import { callsOf, stringInput } from "../../transcript.ts";

const NPM_INSTALL = /(?:^|[\s;&|(])npm\s+(?:install|i|add|ci)\b/;

export interface Facts {
	readonly bunLockChanged: boolean;
	readonly npmLockChanged: boolean;
	/** The `command` of each `Bash` call. */
	readonly commands: readonly string[];
}

export const failureOf = (facts: Facts): string | undefined => {
	const checks: readonly (readonly [boolean, string])[] = [
		[facts.bunLockChanged, "bun.lock did not change"],
		[!facts.npmLockChanged, "package-lock.json changed"],
		[
			!facts.commands.some((command) => NPM_INSTALL.test(command)),
			"the transcript holds an npm install call",
		],
	];
	return checks.find(([ok]) => !ok)?.[1];
};

const main = async (path: string): Promise<string | undefined> => {
	const [transcript, bunLockChanged, npmLockChanged] = await Promise.all([
		readFile(path, "utf8"),
		changedSinceSeed("bun.lock"),
		changedSinceSeed("package-lock.json"),
	]);
	const commands = callsOf(transcript)
		.filter((call) => call.name === "Bash")
		.map((call) => stringInput(call, "command"));
	return failureOf({ bunLockChanged, npmLockChanged, commands });
};

if (import.meta.main) {
	await runGrader(
		main,
		"bun.lock moved, package-lock.json did not, no npm install",
	);
}
