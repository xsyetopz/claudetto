/** Blocks in a row, with no file changed between them, after which the loop is named. */
export const STALL_BLOCKS = 3;

/** The tools whose result is a file the session changed. */
const WRITERS: ReadonlySet<string> = new Set([
	"Edit",
	"MultiEdit",
	"NotebookEdit",
	"Write",
]);

export const writesFile = (tool: string): boolean => WRITERS.has(tool);

export const STALL_LINE = `A Stop hook blocked ${STALL_BLOCKS} times and no file changed between them. If a \`/goal\` keeps the session going, \`/goal clear\` ends it.`;

export const STALL_ASK =
	"No file changed in the last blocks, so there is nothing new to do. Answer this block in one line of text.";
