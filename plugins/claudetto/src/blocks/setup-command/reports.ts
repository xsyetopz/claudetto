import { generalText } from "./general-rules.ts";
import type { Asker } from "./questions.ts";

/** `$.fs.write` as a closure, since the hook loader follows `$` only inside the file that holds the hook. */
export type Writer = (path: string, text: string) => Promise<void>;

export interface RulesFiles {
	readonly path: string;
	readonly held: string | undefined;
	readonly shipped: string | undefined;
}

export const rulesReport = async (
	write: Writer,
	{ path, held, shipped }: RulesFiles,
): Promise<string> => {
	if (shipped === undefined || held === shipped) {
		return `${path} already holds the shipped code rules. It was not written.`;
	}
	try {
		await write(path, shipped);
		return `Wrote ${path}. A new session loads it after its first file read.`;
	} catch (error) {
		return `Could not write ${path} (${String(error)}).`;
	}
};

export const generalReport = async (
	write: Writer,
	ask: Asker,
	path: string,
	held: string | undefined,
): Promise<string> => {
	const text = await generalText(ask, held);
	if (text === undefined) {
		return `Nothing was written to ${path}: the question was dismissed.`;
	}
	try {
		await write(path, text);
		return `Wrote ${path}.`;
	} catch (error) {
		return `Could not write ${path} (${String(error)}).`;
	}
};
