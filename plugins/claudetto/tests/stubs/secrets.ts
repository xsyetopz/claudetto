// The shared fakes of the lab tests of the `gate.secrets` hook: a stubbed project at `/p`, the answer of core, and the records of the state.
// The file holds no test, so a copy in each test file would be a clone.
// The env file names are built in code, because the gate denies a command that names one.
// The scan of the project is `rg --files` through `process.run`, and the stub lists the files whose name holds `env`.

import type { On } from "claude-code";
import { type Engine, mock } from "claude-code/testing";
import { ENV_VALUES_MAX } from "../../modules/gate/limits.ts";
import {
	SHORT_VALUES_FULL,
	UNMASKED,
} from "../../modules/gate/secrets/prompts.ts";
import { isRecord } from "../../modules/jev/domain/jev.ts";
import { ran, stubState } from "./process.ts";

export const ENV = ".env";
export const TOKEN = "sk-live-abcdef123456";
export const PASS = "hunter2hunter2";

const ENV_NAME = /\/[^/]*e[n]v[^/]*$/;

/** The answer of the stubbed `process.run` for the scan of the project: the env files of `files` for `rg`, and for `find` when `rg` is `missing`. */
const scan = (
	on: On,
	files: Record<string, string>,
	{ missing = false, other = (): ReturnType<typeof ran> => ran("") } = {},
) =>
	on("process.run", (_$, e) => {
		const [tool] = e.argv;
		const isScan = tool === "find" || e.argv.includes("--files");
		if (!isScan) {
			return other();
		}
		if (tool === "rg" && missing) {
			return ran("", 127);
		}
		return ran(
			`${Object.keys(files)
				.filter((f) => ENV_NAME.test(f))
				.join("\n")}\n`,
		);
	});

/** The project at `/p` with the files `files` (a path to its text), and the answer `reply` of core. `reads` counts the reads of each file. The state goes to `store`, and `act` runs inside the call, as a command that removes a file does. */
export const stub = (
	on: On,
	files: Record<string, string>,
	reply: unknown,
	{
		mtime = (): number => 1,
		root = "/p",
		store = new Map<string, unknown>(),
		scanning = {},
		act = (): void => undefined,
		state = stubState,
		failure = (): string | undefined => undefined,
	}: {
		mtime?: () => number;
		root?: string;
		store?: Map<string, unknown>;
		scanning?: Parameters<typeof scan>[2];
		act?: () => void;
		failure?: () => string | undefined;
		state?: (on: On, store: Map<string, unknown>) => void;
	} = {},
) => {
	const reads: string[] = [];
	on("session.root", () => ({ value: root }));
	on("session.cwd", () => ({ value: root }));
	mock.env(on, { HOME: "/u" });
	scan(on, files, scanning);
	state(on, store);
	on("fs.stat", (_$, e) =>
		e.path in files
			? {
					value: { kind: "file", size: 0, mtimeMs: mtime(), isLink: false },
				}
			: { deny: "ENOENT" },
	);
	on("fs.read", (_$, e) => {
		reads.push(e.path);
		const failed = failure();
		if (failed !== undefined) {
			return { deny: failed };
		}
		const text = files[e.path];
		return text === undefined ? { deny: "ENOENT" } : { value: text };
	});
	on("tool.call", () => {
		act();
		return { result: reply };
	});
	return reads;
};

export const bash = ($: Engine) =>
	$.tool.call({ tool: "Bash", command: "echo hi" });

/** The lines of the context of a call that say some env files are not masked. */
export const warned = (context: readonly string[] | undefined) =>
	(context ?? []).filter((c) => c.startsWith(UNMASKED_HEAD));

// The text of `UNMASKED` before its reason, so a change of the wording moves the test with it.
const UNMASKED_HEAD = UNMASKED({ why: "\0" }).split("\0")[0] ?? "";

/** The lines of the context of a call that say a short value may show after its file is gone. */
export const shortWarned = (context: readonly string[] | undefined) =>
	(context ?? []).filter(
		(c) => c === SHORT_VALUES_FULL({ max: ENV_VALUES_MAX }),
	);

/** A record of the state: the salt has a `key` only. */
export interface HashRecord {
	key: string;
	len: number | undefined;
	head: number | undefined;
}

const numberOr = (x: unknown): number | undefined =>
	typeof x === "number" ? x : undefined;

/** The records that the mod kept in the state under `envHashes`. */
export const records = (store: Map<string, unknown>): HashRecord[] => {
	const held = store.get("envHashes");
	return Object.values(isRecord(held) ? held : {}).flatMap((r) =>
		isRecord(r) && typeof r["key"] === "string"
			? [{ key: r["key"], len: numberOr(r["len"]), head: numberOr(r["head"]) }]
			: [],
	);
};

/** Keeps the state with versions, as the engine does. A write of another call lands after the first `state.get`, so the first `state.set` with that version misses. */
export const racing =
	(other: Record<string, unknown>) =>
	(on: On, store: Map<string, unknown>): void => {
		const held = { version: 0 };
		let isRaced = false;
		on("state.get", (_$, e) => {
			const answer = { value: store.get(e.key), version: held.version };
			if (!isRaced) {
				isRaced = true;
				store.set(e.key, other);
				held.version++;
			}
			return { value: answer };
		});
		on("state.set", (_$, e) => {
			if (e.ifVersion !== undefined && e.ifVersion !== held.version) {
				return { value: { isSet: false, version: held.version } };
			}
			store.set(e.key, e.value);
			held.version++;
			return { value: { isSet: true, version: held.version } };
		});
	};
