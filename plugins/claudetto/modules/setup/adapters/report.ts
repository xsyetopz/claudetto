// The output of `claudetto-setup`: the settings file write, the dry-run line, and the report of the target and the changes.
import fs from "node:fs/promises";
import path from "node:path";
import { writeAtomic } from "../../../kernel/node/fs.ts";
import type { Json } from "../domain/merge.ts";
import { t } from "../prompts.ts";
import { context7Files, exists, skillDescription } from "./scan.ts";

export interface Io {
	log: (line: string) => void;
	error: (line: string) => void;
}

export const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

/** Prints `message` as an error and gives the exit status of a bad call. */
export const fail = (io: Io, message: string): number => {
	io.error(message);
	return 2;
};

interface Run {
	file: string;
	settings: Json;
	changes: string[];
	apply: boolean;
	backup: boolean;
}

/** Writes `settings` to `file` with `apply` and a change, after a copy of the old file with `backup`, or prints the dry-run line. */
export const save = async (
	io: Io,
	{ file, settings, changes, apply, backup }: Run,
): Promise<number> => {
	if (changes.length === 0) {
		return 0;
	}
	if (apply) {
		await fs.mkdir(path.dirname(file), { recursive: true });
		if (backup && (await exists(file))) {
			const copy = `${file}.${Date.now()}.bak`;
			await fs.copyFile(file, copy);
			io.log(t("backup", { file: copy }));
		}
		await writeAtomic(file, `${JSON.stringify(settings, null, 2)}\n`);
		io.log(`\n${t("wrote", { file })}`);
	} else {
		io.log(`\n${t("dryRun")}`);
	}
	return 0;
};

interface Info {
	file: string;
	scope: string;
	cap: unknown;
	tier: string;
	kept: string[];
	dirs: string[];
	changes: string[];
}

/** Prints the target, the notes, the `context7` files, and the changes. */
export const report = async (
	io: Io,
	{ file, scope, cap, tier, kept, dirs, changes }: Info,
) => {
	io.log(`Target: ${file} (${scope} scope)`);
	if (scope === "project") {
		io.log(t("projectNoStatus"));
	}
	if (scope === "project") {
		io.log(t("projectNoCap"));
	} else if (!cap) {
		io.log(t("noPlanCap", { tier }));
	}
	for (const key of kept) {
		io.log(t("keptKey", { key }));
	}
	const own = path.join(ROOT, "skills", "find-docs", "SKILL.md");
	const ownChars = skillDescription(
		await globalThis.Bun.file(own).text(),
	).length;
	for (const dir of new Set(dirs)) {
		for (const [found, chars] of await context7Files(dir)) {
			io.log(t("context7", { file: found, chars, ownChars }));
		}
	}
	io.log(
		changes.length > 0 ? `${changes.length} change(s):` : t("settingsMatch"),
	);
	for (const line of changes) {
		io.log(`  ${line}`);
	}
};
