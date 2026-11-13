import { mkdir, stat, utimes, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { spawn, which } from "bun";

import { MOLE } from "../hooks/command.run/useSetup/tools";

const DAY_MS = 86_400_000;

/**
 * Runs Mole's cache clean, whose own log `mo history` shows, and returns one report line. With no terminal on stdin, Mole cleans user caches without a prompt and skips the ones that need sudo.
 * A clean takes minutes of CPU, so a real one starts detached, at most once a day by the mtime of `stamp`, and the session start never waits for it. A dry run waits, so its caller sees the exit.
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
	if (dryRun) {
		const code = await spawn([mo, "clean", "--dry-run"], {
			stdin: "ignore",
			stdout: "ignore",
			stderr: "ignore",
		}).exited;
		return `${MOLE.name} clean --dry-run exited ${code}.`;
	}
	const last = await stat(stamp).then(
		(s) => s.mtimeMs,
		() => 0,
	);
	if (now - last < DAY_MS) {
		return `${MOLE.name} clean ran in the last day, so it did not start.`;
	}
	await mkdir(dirname(stamp), { recursive: true });
	await writeFile(stamp, "");
	await utimes(stamp, now / 1000, now / 1000);
	spawn([mo, "clean"], {
		detached: true,
		stdin: "ignore",
		stdout: "ignore",
		stderr: "ignore",
	}).unref();
	return `${MOLE.name} clean started.`;
};
