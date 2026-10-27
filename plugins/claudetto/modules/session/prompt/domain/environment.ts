// The shell facts of the `shell` context block (D9 of change `0-3-0`, faults F29 and F33): the traps of the platform and the shell.

import { SHELL_MACOS, SHELL_ZSH } from "../prompts.ts";

export const SHELL_BLOCK = "shell";

/** The shell facts for the `uname -s` value `platform` and the `SHELL` path `shell`, or `""` when none applies. */
export const shellFacts = (platform: string, shell: string): string =>
	[
		platform.trim().toLowerCase() === "darwin" ? SHELL_MACOS : "",
		shell.endsWith("/zsh") ? SHELL_ZSH : "",
	]
		.filter(Boolean)
		.join("\n");
