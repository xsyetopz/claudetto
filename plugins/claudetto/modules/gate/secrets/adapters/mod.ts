// The mod handler of the `secrets` slice (task 19.16 of change `redesign-0-4-0`): `tool.call` on each tool.
// A program may load the keys of an env file, but the model never reads a value, so the handler calls `next` and replaces each value in the result.
// It lists the env files of the project itself with `rg`, else `find`, and reads a file again only when its modification time changes.
// A value of `ENV_PERSIST_MIN` or more characters that an env file held stays replaced by its slow hash in `$.state`, which holds no value, also when the file is gone and after a reload of the mod in the same session (task 19.20).
// A shorter value stays in the memory of the mod only, because a short value falls to a brute force of its record fast. `$.state` has no file, so no tool call of the agent can read a record.
// The Mod API gives a result with `ref` and `text` as core made them, and core uses them as they are, so a changed result leaves both out.

import type { EngineInterface } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import { projectRoot } from "../../../project/domain/session.ts";
import {
	ENV_CONFIRMS_MAX,
	ENV_FILE_CHARS,
	ENV_SCAN_CACHE_MS,
	ENV_SCAN_MS,
	ENV_VALUES_MAX,
} from "../../limits.ts";
import {
	type Entry,
	type Mask,
	masksOf,
	scrub,
	scrubDeep,
} from "../domain/env.ts";
import { newBudget, scrubHashed } from "../domain/hash-scrub.ts";
import { type Hashed, validHashes } from "../domain/hashes.ts";
import {
	CUT,
	SHORT_VALUES_FULL,
	UNMASKED,
	WHY_SIZE,
	WHY_VALUES,
} from "../prompts.ts";
import { entriesOf, type Files, held, type Run, scan } from "./env-files.ts";
import { type HashState, saveHashes } from "./hash-store.ts";
import { remembered, rememberShorts, shortsOf } from "./short-values.ts";

const TRAILING_SLASHES = /\/+$/;

const hashedRef = { plugin: "claudetto", key: "envHashes" } as const;

/** The last list of env files of a scan, with the time of the scan. */
let listed:
	| { root: string; at: number; files: string[]; why: string | undefined }
	| undefined;

/** The masks of each value of the env files of the project and of `extra`, the hashes of each value that a file held, the entries that the scan read, and the reason when a bound left a file unmasked. A scan reuses the last list when it is younger than `ENV_SCAN_CACHE_MS` and `isFresh` is not set. */
const masksOfProject = async (
	$: EngineInterface,
	isFresh: boolean,
	extra: readonly Entry[] = [],
): Promise<{
	masks: Mask[];
	known: Hashed;
	entries: Entry[];
	why: string | undefined;
	isShortFull: boolean;
}> => {
	const root = (
		await projectRoot({
			dir: () => $.env.get("CLAUDE_PROJECT_DIR"),
			root: () => $.session.root(),
		})
	).replace(TRAILING_SLASHES, "");
	const stored = await $.state.get(hashedRef);
	const run: Run = (argv) =>
		$.process
			.run(argv, { cwd: root, timeoutMs: ENV_SCAN_MS })
			.catch(() => undefined);
	const fileReads: Files = {
		stat: (path) => $.fs.stat(path).catch(() => undefined),
		read: (path) => $.fs.read(path).catch(() => undefined),
	};
	const hashState: HashState = {
		get: () => $.state.get(hashedRef),
		set: async (records, ifVersion) =>
			(await $.state.set(hashedRef, records, { ifVersion })).isSet,
	};
	if (root === "") {
		return {
			masks: [],
			known: validHashes(stored.value),
			entries: [],
			why: undefined,
			isShortFull: false,
		};
	}
	if (
		isFresh ||
		listed === undefined ||
		listed.root !== root ||
		Date.now() - listed.at > ENV_SCAN_CACHE_MS
	) {
		listed = { root, at: Date.now(), ...(await scan(run, root)) };
	}
	const entries: Entry[] = [...extra];
	let why = listed.why;
	const shorts: { entry: Entry; path: string | undefined }[] = shortsOf(
		extra,
	).map((entry) => ({ entry, path: undefined }));
	const readable = new Set<string>();
	const reads = await Promise.all(
		listed.files.map((path) => entriesOf(fileReads, path)),
	);
	for (const [i, read] of reads.entries()) {
		const path = listed.files[i] ?? "";
		entries.push(...read.entries);
		if (read.isLong) {
			why = WHY_SIZE({ max: ENV_FILE_CHARS });
		} else if (held.has(path)) {
			readable.add(path);
		}
		shorts.push(...shortsOf(read.entries).map((entry) => ({ entry, path })));
	}
	const isShortFull = rememberShorts(shorts, readable);
	const { known, isFull } = await saveHashes(hashState, entries, stored);
	if (isFull && why === undefined) {
		why = WHY_VALUES({ max: ENV_VALUES_MAX });
	}
	return {
		masks: masksOf([
			...entries,
			...[...remembered.values()].map(({ entry }) => entry),
		]),
		known,
		entries,
		why,
		isShortFull,
	};
};

/** `tool.call` on each tool: the result and the context of the call have no value of an env file, and a key stands in its place. A bound of the scan adds one line to the context. A fault of the read leaves the result as it is. */
export const onResult: Handler<"tool.call"> = async ($, e, next) => {
	// The values are read before the call, because the call can move or delete the file. The masks after the call hold them too.
	const before = await masksOfProject($, false).catch(() => undefined);
	const answer = await next(e);
	if (answer.deny !== undefined) {
		return answer;
	}
	try {
		const { masks, known, why, isShortFull } = await masksOfProject(
			$,
			true,
			before?.entries,
		);
		const budget = newBudget(known);
		const clean = (t: string): string =>
			scrubHashed(scrub(t, masks), known, budget);
		const result = scrubDeep(answer.result, clean);
		const scrubbed = answer.context?.map(clean);
		const text = answer.text === undefined ? undefined : clean(answer.text);
		const lines = [
			...(why === undefined ? [] : [UNMASKED({ why })]),
			...(isShortFull ? [SHORT_VALUES_FULL({ max: ENV_VALUES_MAX })] : []),
			...(budget.isCut ? [CUT({ max: ENV_CONFIRMS_MAX })] : []),
		];
		const context =
			lines.length === 0 ? scrubbed : [...(scrubbed ?? []), ...lines];
		if (
			result === answer.result &&
			text === answer.text &&
			lines.length === 0 &&
			scrubbed?.every((c, i) => c === answer.context?.[i]) !== false
		) {
			return answer;
		}
		const changed = {
			result,
			...(context === undefined ? {} : { context }),
		};
		return answer.isError
			? { ...changed, isError: true, ...(text === undefined ? {} : { text }) }
			: changed;
	} catch {
		// The rule is a help, and a fault of it must not hide the result of the tool.
		return answer;
	}
};
