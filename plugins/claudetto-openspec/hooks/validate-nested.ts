// Upstream's namespace-folder rule: which folders under changes/ wrap further changes.
import { type Fs, join, safeList } from "./fs";
import { discoverDeltas } from "./validate-discover";

const ROOT_MARKERS = [".openspec.yaml", "proposal.md", "tasks.md", "design.md"];
const visible = async (fs: Fs, dir: string) => {
	const entries = await safeList(fs, dir);
	return entries.filter((e) => !e.name.startsWith("."));
};

const looksLikeChange = async (fs: Fs, dir: string) => {
	const entries = await safeList(fs, dir);
	const names = new Set(entries.map((e) => e.name));
	const d = await discoverDeltas(fs, join(dir, "specs"));
	return (
		ROOT_MARKERS.some((m) => names.has(m)) ||
		d.found.length + d.unread.length + d.stray.length > 0
	);
};

const changesWithin = async (
	fs: Fs,
	dir: string,
	prefix: string,
	depth: number,
): Promise<string[]> => {
	const entries = await visible(fs, dir);
	const dirs = entries.filter((e) => e.kind === "dir");
	const nested = await Promise.all(
		dirs.map(async (e) => {
			const id = `${prefix}/${e.name}`;
			if (await looksLikeChange(fs, join(dir, e.name))) {
				return [id];
			}
			return depth < 3
				? changesWithin(fs, join(dir, e.name), id, depth + 1)
				: [];
		}),
	);
	return nested.flat().toSorted();
};

// A directory under changes/ that is no change (no root artifact, no delta file) and holds only
// directories, with changes within three levels below, wraps changes. Returns those paths relative to changes/.
export const nestedChanges = async (fs: Fs, dir: string, name: string) => {
	if (name === "archive" || (await looksLikeChange(fs, dir))) {
		return [];
	}
	const entries = await visible(fs, dir);
	return entries.some((e) => e.kind !== "dir")
		? []
		: changesWithin(fs, dir, name, 1);
};
