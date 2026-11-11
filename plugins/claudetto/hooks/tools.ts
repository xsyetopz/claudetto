import type { BuiltinToolName } from "claude-code";

/** The tools whose result is a file the session changed. */
export const WRITERS = [
	"Edit",
	"NotebookEdit",
	"Write",
] satisfies BuiltinToolName[];

const WRITER_NAMES: ReadonlySet<string> = new Set(WRITERS);

export const isWriter = (tool: string): boolean => WRITER_NAMES.has(tool);

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);
