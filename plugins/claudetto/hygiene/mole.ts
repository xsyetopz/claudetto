import { spawn, which } from "bun";

import { MOLE } from "../hooks/command.run/useSetup/tools";

/** Runs Mole's cache clean, whose own log `mo history` shows, and returns one report line. With no terminal on stdin, Mole cleans user caches without a prompt and skips the ones that need sudo. */
export const cleanCaches = async (dryRun: boolean): Promise<string> => {
	const mo = which(MOLE.name, { PATH: process.env["PATH"] ?? "" });
	if (mo === null) {
		return `${MOLE.name} is not on PATH, so no cache was cleaned: install it with \`${MOLE.install.join(" ")}\`.`;
	}
	const argv = ["clean", ...(dryRun ? ["--dry-run"] : [])];
	const code = await spawn([mo, ...argv], {
		stdin: "ignore",
		stdout: "ignore",
		stderr: "ignore",
	}).exited;
	return `${MOLE.name} ${argv.join(" ")} exited ${code}.`;
};
