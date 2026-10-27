// The reads and writes that the helpers of the `protect` slice use: the closures of `mod.ts`, so that `$` stays in the hook's own file.

import type { EngineInterface } from "claude-code";
import type { Known } from "../domain/protect.ts";

type Fs = EngineInterface["fs"];

export interface Io {
	list: Fs["list"];
	exists: Fs["exists"];
	read: (path: string) => Promise<unknown>;
	write: Fs["write"];
	/** The stat of `path` with its real path. */
	stat: (path: string) => Promise<{ realPath?: string }>;
	run: EngineInterface["process"]["run"];
	/** The values of the env vars that `git` and `ssh` read, by name. */
	env: () => Promise<{ [name: string]: string }>;
	/** The pin of the session, with its version. */
	known: () => Promise<{ value: Known | undefined; version: number }>;
	/** Saves the pin when the version is still `version`. */
	pin: (known: Known, version: number) => Promise<unknown>;
}
