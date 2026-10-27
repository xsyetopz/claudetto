// The answers of a stubbed `process.run`, `state.get`, and `state.set`, which the lab tests of several slices share.
// The file holds no test, so a copy in each test file would be a clone.

import type { On } from "claude-code";

/** The answer of `process.run` for a process that exits with `exitCode` and prints `stdout`. */
export const ran = (stdout: string, exitCode = 0) => ({
	value: {
		exitCode,
		stdout,
		stderr: "",
		isStdoutTruncated: false,
		isStderrTruncated: false,
	},
});

/** The key of a state value in the store: a family member has its `id` after the key. */
const id = (e: { key: string; id?: string | undefined }) =>
	e.id === undefined ? e.key : `${e.key}/${e.id}`;

/** Keeps the state in `store`: `state.get` reads a key, and `state.set` writes it. */
export const stubState = (on: On, store: Map<string, unknown>) => {
	on("state.get", (_$, e) => ({
		value: { value: store.get(id(e)), version: 0 },
	}));
	on("state.set", (_$, e) => {
		store.set(id(e), e.value);
		return { value: { isSet: true, version: 1 } };
	});
};

/** Stubs `session.usage` for a fresh session with no rate limits, and `session.turns` for no turn. */
export const stubFreshSession = (on: On) => {
	on("session.usage", () => ({
		value: {
			startedAt: 0,
			context: { window: 1_000_000, tokens: 0 },
			rateLimits: [],
		},
	}));
	on("session.turns", () => ({ value: 0 }));
};
