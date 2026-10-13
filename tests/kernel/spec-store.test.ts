// Tests of the spec store reader, with a fake `FileReader` and no file on disk.

import { expect, test } from "bun:test";
import type { FileReader } from "../../src/kernel/ports.ts";
import {
  activeProgress,
  eventsPath,
  lastLanes,
  packageLanes,
  readEvents,
  SPEC_SCHEMA,
  scanEvents,
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

/** The text of an `events.jsonl` with one line for each package of `lanes`, and the schema `schema`. */
const eventsText = (lanes: Record<string, string>, schema = SPEC_SCHEMA) =>
  [
    { schema },
    ...Object.entries(lanes).map(([pkg, lane]) => ({
      at: "2026-01-01T00:00:00.000Z",
      package: pkg,
      lane,
    })),
  ]
    .map((line) => JSON.stringify(line))
    .join("\n");

test("`readEvents` gives the lines of a change with a known schema", async () => {
  const files = fakeFiles({
    [eventsPath("1.0.0")]: eventsText({ "01a": "done", "01b": "doing" }),
  });
  expect(await readEvents(files, "1.0.0")).toStrictEqual([
    { at: "2026-01-01T00:00:00.000Z", package: "01a", lane: "done" },
    { at: "2026-01-01T00:00:00.000Z", package: "01b", lane: "doing" },
  ]);
});

test("`readEvents` gives null for a change with no `events.jsonl`", async () => {
  expect(await readEvents(fakeFiles({}), "1.0.0")).toBe(null);
});

test("`readEvents` stops with an error that names the file when the schema is unknown", async () => {
  const file = eventsPath("1.0.0");
  const files = fakeFiles({ [file]: eventsText({ "01a": "done" }, 2) });
  await expect(readEvents(files, "1.0.0")).rejects.toThrow(file);
});

test("`readEvents` names the file and the line of a line that is not JSON", async () => {
  const file = eventsPath("1.0.0");
  const text = `${eventsText({ "01a": "done" })}\n{"at":\n`;
  const files = fakeFiles({ [file]: text });
  await expect(readEvents(files, "1.0.0")).rejects.toThrow(`${file}:3`);
});

test("`readEvents` skips a torn last line with no line end, and `scanEvents` gives its line", async () => {
  const file = eventsPath("1.0.0");
  const text = `${eventsText({ "01a": "done" })}\n{"at":`;
  const files = fakeFiles({ [file]: text });
  const scan = await scanEvents(files, "1.0.0");
  expect(scan?.events.map((e) => e.package)).toStrictEqual(["01a"]);
  expect(scan?.torn).toBe(3);
  expect((await readEvents(files, "1.0.0"))?.length).toBe(1);
});

test("`scanEvents` gives no torn line when the last line is JSON with no line end", async () => {
  const file = eventsPath("1.0.0");
  const files = fakeFiles({ [file]: `${eventsText({ "01a": "done" })}` });
  expect((await scanEvents(files, "1.0.0"))?.torn).toBe(null);
});

test("the lanes of a log equal the last line of each package", async () => {
  const at = "2026-01-01T00:00:00.000Z";
  const lines = [
    { at, package: "P01", lane: "planned" },
    { at, package: "P02", lane: "planned" },
    { at, package: "P01", lane: "doing" },
    { at, package: "P02", lane: "doing" },
    { at, package: "P01", lane: "done" },
    { at, package: "P02", lane: "blocked" },
    { at, package: "P02", lane: "doing" },
  ] as const;
  const text = [{ schema: SPEC_SCHEMA }, ...lines]
    .map((line) => JSON.stringify(line))
    .join("\n");
  const files = fakeFiles({ [eventsPath("1.0.0")]: text });
  const events = (await readEvents(files, "1.0.0")) ?? [];
  expect(lastLanes(events)).toStrictEqual({ P01: "done", P02: "doing" });
  expect(await packageLanes(files, "1.0.0", events)).toStrictEqual({
    P01: "done",
    P02: "doing",
  });
});

test("`activeProgress` counts the done packages of the last change that is not done", async () => {
  const files = fakeFiles({
    [eventsPath("0.9.0")]: eventsText({ a: "planned" }),
    [eventsPath("1.0.0")]: eventsText({
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

test("`activeProgress` gives null when every change is done or none has an events log", async () => {
  const done = fakeFiles({
    [eventsPath("1.0.0")]: eventsText({ "01a": "done" }),
  });
  expect(await activeProgress(done)).toBe(null);
  expect(await activeProgress(fakeFiles({}))).toBe(null);
});
