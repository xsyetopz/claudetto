import type { EngineInterface } from "claude-code";

/** A run of a program with a time bound in ms. */
export type Run = (
	argv: string[],
	timeoutMs: number,
) => ReturnType<EngineInterface["process"]["run"]>;

export type FileStat = Awaited<ReturnType<EngineInterface["fs"]["stat"]>>;
