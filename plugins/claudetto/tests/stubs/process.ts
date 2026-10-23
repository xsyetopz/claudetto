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

/** Keeps the state in `store`: `state.get` reads a key, and `state.set` writes it. */
export const stubState = (on: On, store: Map<string, unknown>) => {
  on("state.get", (_$, e) => ({
    value: { value: store.get(e.key), version: 0 },
  }));
  on("state.set", (_$, e) => {
    store.set(e.key, e.value);
    return { value: { isSet: true, version: 1 } };
  });
};
