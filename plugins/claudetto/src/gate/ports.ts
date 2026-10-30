// The types of the small ports that `mod.ts` builds from `$`, so no helper takes `$` (the validator follows `$` into a `function` declaration only).

import type { EngineInterface } from "claude-code";

/** A run of a program with a time bound in ms. */
export type Run = (
	argv: string[],
	timeoutMs: number,
) => ReturnType<EngineInterface["process"]["run"]>;

/**
 * What the engine's own `fs.stat` resolves to, taken from its type rather than written out, so a
 * change to the engine's shape reaches every caller as a type error instead of silently.
 */
export type FileStat = Awaited<ReturnType<EngineInterface["fs"]["stat"]>>;
