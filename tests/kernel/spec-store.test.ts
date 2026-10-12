// Tests of the spec store reader, with a fake `FileReader` and no file on disk.

import { expect, test } from "bun:test";
import type { FileReader } from "../../src/kernel/ports.ts";
import {
  activeProgress,
  readState,
  SPEC_SCHEMA,
  statePath,
} from "../../src/kernel/spec-store.ts";

/** A `FileReader` over a map of path to text. A folder is a key of the map that has a `/` after it. */
const fakeFiles = (files: Record<string, string>): FileReader => ({
  read: async (file) => files[file] ?? null,
  list: async (dir) => {
    const names = new Set<string>();
    for (const file of Object.keys(files))
      if (file.startsWith(`${dir}/`))
        names.add(file.slice(dir.length + 1).split("/")[0] as string);
    return [...names];
  },
});

/** The text of a `state.json` with the lanes `lanes` and the schema `schema`. */
const stateText = (lanes: Record<string, string>, schema = SPEC_SCHEMA) =>
  JSON.stringify({ schema, lanes, events: [], handoff: null });

test("`readState` gives the state of a change with a known schema", async () => {
  const files = fakeFiles({
    [statePath("1.0.0")]: stateText({ "01a": "done", "01b": "doing" }),
  });
  expect(await readState(files, "1.0.0")).toStrictEqual({
    schema: SPEC_SCHEMA,
    lanes: { "01a": "done", "01b": "doing" },
    events: [],
    handoff: null,
  });
});

test("`readState` gives null for a change with no `state.json`", async () => {
  expect(await readState(fakeFiles({}), "1.0.0")).toBe(null);
});

test("`readState` stops with an error that names the file when the schema is unknown", async () => {
  const file = statePath("1.0.0");
  const files = fakeFiles({ [file]: stateText({ "01a": "done" }, 2) });
  await expect(readState(files, "1.0.0")).rejects.toThrow(file);
});

test("`activeProgress` counts the done packages of the last change that is not done", async () => {
  const files = fakeFiles({
    [statePath("0.9.0")]: stateText({ a: "planned" }),
    [statePath("1.0.0")]: stateText({
      "01a": "done",
      "01b": "done",
      "01c": "review",
      "01d": "planned",
    }),
  });
  expect(await activeProgress(files)).toStrictEqual({
    id: "1.0.0",
    done: 2,
    total: 4,
  });
});

test("`activeProgress` gives null when every change is done or none has a state", async () => {
  const done = fakeFiles({
    [statePath("1.0.0")]: stateText({ "01a": "done" }),
  });
  expect(await activeProgress(done)).toBe(null);
  expect(await activeProgress(fakeFiles({}))).toBe(null);
});
