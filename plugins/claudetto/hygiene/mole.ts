import { mkdir, stat, utimes, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { spawn, which } from "bun";

import { MOLE } from "../hooks/command.run/useSetup/tools";

const DAY_MS = 86_400_000;

/**
 * Runs Mole's cache clean, whose own log `mo history` shows, and returns one report line. With no terminal on stdin, Mole cleans user caches without a prompt and skips the ones that need sudo.
 * A clean takes minutes of CPU, so a real one runs at most once a day, by the mtime of `stamp`.
 */
export const cleanCaches = async (
	dryRun: boolean,
	stamp: string,
	now: number,
): Promise<string> => {
	const mo = which(MOLE.name, { PATH: process.env["PATH"] ?? "" });
	if (mo === null) {
		return `${MOLE.name} is not on PATH, so no cache was cleaned: install it with \`${MOLE.install.join(" ")}\`.`;
	}
	if (!dryRun) {
		const last = await stat(stamp).then(
			(s) => s.mtimeMs,
			() => 0,
		);
		if (now - last < DAY_MS) {
			return `${MOLE.name} clean ran in the last day, so it did not run.`;
		}
		await mkdir(dirname(stamp), { recursive: true });
		await writeFile(stamp, "");
		await utimes(stamp, now / 1000, now / 1000);
	}
	const args = dryRun ? ["clean", "--dry-run"] : ["clean"];
	const code = await spawn([mo, ...args], {
		stdin: "ignore",
		stdout: "ignore",
		stderr: "ignore",
	}).exited;
	return `${MOLE.name} ${args.join(" ")} exited ${code}.`;
};
