// Finding the delta files of a change and the main specs they merge into.
import {
	dirname,
	type Fs,
	join,
	nonEmpty,
	safeList,
	statOf,
	within,
} from "./fs.ts";
import { withoutFences } from "./spec-rules.ts";
import { blocks, section } from "./spec.ts";

const DELTA_SECTION = /^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements/imu;

// A literal backslash in a folder name displays as a slash, as upstream shows it.
const slashed = (parts: string[]) => parts.join("/").replaceAll("\\", "/");

export interface Found {
	id: string;
	file: string;
	path: string;
}

const holdsDelta = async (fs: Fs, name: string, full: string) => {
	if (name === "spec.md" || !name.toLowerCase().endsWith(".md")) {
		return false;
	}
	const info = await statOf(fs, full);
	return (
		info?.kind === "file" &&
		DELTA_SECTION.test(withoutFences(await fs.read(full)))
	);
};

const byPath = (x: { path: string }, y: { path: string }) =>
	x.path < y.path ? -1 : 1;
const byText = (x: string, y: string) => (x < y ? -1 : 1);

// spec.md files below specs/ are deltas keyed by their directory. Any other file is one the merge
// drops: `unread` holds the .md files with a delta section (upstream's list), `stray` the rest
// (#2173). Dot entries and symlinked directories are not followed.
export const discoverDeltas = async (fs: Fs, specsDir: string) => {
	const found: Found[] = [];
	const unread: { path: string; expected: string }[] = [];
	const stray: string[] = [];
	const visit = async (
		e: { name: string; kind: string },
		dir: string,
		segments: string[],
	): Promise<void> => {
		const full = join(dir, e.name);
		if (e.kind === "dir") {
			await walk(full, [...segments, e.name]);
		} else if (e.name === "spec.md" && segments.length > 0) {
			found.push({
				id: slashed(segments),
				file: full,
				path: slashed([...segments, e.name]),
			});
		} else if (await holdsDelta(fs, e.name, full)) {
			const capability =
				segments.length > 0 ? segments.join("/") : e.name.slice(0, -3);
			unread.push({
				path: [...segments, e.name].join("/"),
				expected: `${capability}/spec.md`,
			});
		} else {
			stray.push([...segments, e.name].join("/"));
		}
	};
	const walk = async (dir: string, segments: string[]): Promise<void> => {
		const entries = await fs.list(dir);
		await Promise.all(
			entries
				.filter((e) => !e.name.startsWith("."))
				.map((e) => visit(e, dir, segments)),
		);
	};
	const root = await statOf(fs, specsDir);
	if (root?.kind === "dir") {
		await walk(specsDir, []);
	}
	return {
		found: found.toSorted(byPath),
		unread: unread.toSorted(byPath),
		stray: stray.toSorted(byText),
	};
};

export const baseBlocks = async (fs: Fs, mainSpecsDir: string, id: string) => {
	const file = join(mainSpecsDir, id, "spec.md");
	return (await fs.exists(file))
		? blocks(section(await fs.read(file), "Requirements") ?? "")
		: undefined;
};

// A capability directory must be where its id says it is, and a spec.md link must resolve inside
// the specs tree or its own capability directory. Directory links that alias or leave the tree are
// refused here, before any write or delete goes through them.
export const linkEscapes = async (fs: Fs, mainSpecsDir: string, id: string) => {
	const file = join(mainSpecsDir, id, "spec.md");
	const real = async (path: string) => {
		const info = await fs.stat(path, { resolve: true });
		return info.realPath;
	};
	// The nearest existing ancestor of the capability directory must sit at its own path under the real root.
	const anchored = async (path: string, root: string): Promise<boolean> => {
		if (path.length <= mainSpecsDir.length) {
			return true;
		}
		if (await fs.exists(path)) {
			return (await real(path)) === join(root, path.slice(mainSpecsDir.length));
		}
		return anchored(dirname(path), root);
	};
	try {
		const root = await real(mainSpecsDir);
		if (!nonEmpty(root) || !(await anchored(dirname(file), root))) {
			return true;
		}
		// `list` sees a dangling link that `stat` cannot follow.
		const entries = await safeList(fs, dirname(file));
		if (!entries.some((e) => e.name === "spec.md" && e.isLink)) {
			return false;
		}
		const [target, own] = await Promise.all([real(file), real(dirname(file))]);
		return !(
			nonEmpty(target) &&
			nonEmpty(own) &&
			(within(root, target) || within(own, target))
		);
	} catch {
		// No specs tree: nothing to escape. Any other failure to resolve is an escape.
		return fs.exists(mainSpecsDir);
	}
};
