import { readdir } from "node:fs/promises";

export interface Candidate {
	readonly kind: string;
	readonly path: string;
	readonly limitMs: number;
}

// 500 paths of a temp folder stay far under the 1 MiB that macOS allows a command line.
const BATCH = 500;

export const namesIn = async (dir: string) => {
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		return entries.filter((entry) => !entry.isSymbolicLink());
	} catch {
		return [];
	}
};

/** `items` in runs short enough for one command line, so thousands of temp entries cost a few processes. */
export const batched = <T>(items: readonly T[]): T[][] =>
	Array.from({ length: Math.ceil(items.length / BATCH) }, (_, i) =>
		items.slice(i * BATCH, (i + 1) * BATCH),
	);
