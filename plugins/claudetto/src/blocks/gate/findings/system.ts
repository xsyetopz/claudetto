import type { Facts, Verdict } from "../gate.ts";
import { DELETES, erasesDisk } from "../loss.ts";
import { pathOf } from "../paths.ts";
import * as T from "../prompts.ts";
import {
	nameOf,
	operands,
	readsScript,
	scriptOf,
	wordSet,
} from "../shell/shellkinds.ts";
import { baseName } from "../shell/wrappers.ts";
import { atRoot, systemWrite, verdict } from "./finding.ts";

const ROOT_USERS = wordSet("sudo doas su");
const DOWNLOADS = wordSet("curl wget");
const WRITES_ALL = new Set([
	...wordSet("tee touch mkdir rmdir chmod chown chgrp truncate"),
	...DELETES,
]);
const WRITES_LAST = wordSet("cp mv install rsync ditto ln");
const RECURSIVE_FLAG = /^-[A-Za-z]*R/;
const MODE_COMMAND = /^ch(?:mod|own|grp)$/;

export const systemFinding = (
	argv: string[],
	rest: string[],
	f: Facts,
	dir: string,
): Verdict | undefined => {
	const name = nameOf(rest);
	const prefix = argv.slice(0, argv.length - rest.length);
	if (prefix.some((w) => ROOT_USERS.has(baseName(w))) || ROOT_USERS.has(name)) {
		return verdict("deny", T.DENY_ROOT_USER);
	}
	if (erasesDisk(name, rest)) {
		return verdict("deny", T.DENY_DISK);
	}
	const all = WRITES_ALL.has(name);
	if (!all && !WRITES_LAST.has(name)) {
		return undefined;
	}
	const args = operands(rest.slice(1));
	const recursive = rest.some(
		(w) => w === "--recursive" || RECURSIVE_FLAG.test(w),
	);
	const target =
		MODE_COMMAND.test(name) && recursive
			? args.find((t) => atRoot(pathOf(dir, t, f), f))
			: undefined;
	if (target !== undefined) {
		return verdict("deny", T.DENY_ROOT_MODE({ target }));
	}
	const written = all ? args : args.slice(-1);
	return written.map((w) => systemWrite(pathOf(dir, w, f))).find(Boolean);
};

export const runsDownload = (commands: string[][]): boolean =>
	commands.some((argv) => DOWNLOADS.has(nameOf(argv))) &&
	commands.some((argv) => readsScript(argv) || scriptOf(argv) === "");
