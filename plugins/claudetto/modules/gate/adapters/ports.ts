// The types of the small ports that `mod.ts` builds from `$`, so no helper takes `$` (the validator follows `$` into a `function` declaration only).

import type { EngineInterface } from "claude-code";

/** A run of a program with a time bound in ms. */
export type Run = (
	argv: string[],
	timeoutMs: number,
) => ReturnType<EngineInterface["process"]["run"]>;

/** The `stat` of a file. */
export type FileStat = Awaited<ReturnType<EngineInterface["fs"]["stat"]>>;
