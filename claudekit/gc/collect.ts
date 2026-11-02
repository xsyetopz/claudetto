// Picks the scratch folders to remove and removes them, unless it is a dry run.

import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { total } from "../total.ts";
import {
	type CwdLister,
	hasLiveSocket,
	holdsCwd,
	liveSocket,
	lsofCwds,
	type SocketProbe,
} from "./guards.ts";
import { scratchFolders, sizeOf } from "./scan.ts";

const HOUR_MS = 3_600_000;

export interface Options {
	readonly hours: number;
	readonly dryRun: boolean;
	/** The folders to look in. Defaults to `os.tmpdir()` and `/tmp`. */
	readonly roots?: readonly string[];
	readonly now?: number;
	readonly cwds?: CwdLister;
	readonly probe?: SocketProbe;
}

export interface Removal {
	readonly path: string;
	readonly bytes: number;
}

export interface Result {
	readonly entries: readonly Removal[];
	readonly bytes: number;
	/** True when the folders were removed, false for a dry run or `hours` 0. */
	readonly removed: boolean;
}

/** The folders that pass every test, with their sizes, and their removal unless `dryRun`. `hours` 0 removes nothing. */
export const collect = async (options: Options): Promise<Result> => {
	if (options.hours === 0) {
		return { entries: [], bytes: 0, removed: false };
	}
	const cutoff = (options.now ?? Date.now()) - options.hours * HOUR_MS;
	const old = (
		await scratchFolders(options.roots ?? [tmpdir(), "/tmp"])
	).filter((folder) => folder.newest < cutoff);
	if (old.length === 0) {
		return { entries: [], bytes: 0, removed: !options.dryRun };
	}
	const cwds = await (options.cwds ?? lsofCwds())();
	const probe = options.probe ?? liveSocket();
	const checked = await Promise.all(
		old.map(
			async ({ path }): Promise<Removal | undefined> =>
				holdsCwd(path, cwds) || (await hasLiveSocket(path, probe))
					? undefined
					: { path, bytes: await sizeOf(path) },
		),
	);
	const entries = checked.filter((e): e is Removal => e !== undefined);
	if (!options.dryRun) {
		await Promise.all(
			entries.map((e) => rm(e.path, { recursive: true, force: true })),
		);
	}
	return {
		entries,
		bytes: total(entries.map((e) => e.bytes)),
		removed: !options.dryRun,
	};
};
