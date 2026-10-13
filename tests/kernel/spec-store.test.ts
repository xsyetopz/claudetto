// Tests of the event reader and of the package states, with a fake `FileReader` and no file on disk.

import { expect, test } from "bun:test";
import type { FileReader } from "../../src/kernel/ports.ts";
import {
  activeProgress,
  eventLine,
  eventsHeader,
  eventsPath,
  lastStates,
  packageStates,
  readEvents,
  SPEC_SCHEMA,
  type StateEvent,
  scanEvents,
} from "../../src/kernel/spec-store.ts";

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

const event = (state: string, extra: Partial<StateEvent> = {}): StateEvent => ({
  at: "2026-01-01T00:00:00.000Z",
  package: "P1",
  state,
  ...extra,
});

const withLog = (text: string): FileReader =>
  fakeFiles({ [eventsPath("c1")]: text });

test("the header and the lines round-trip through the reader", async () => {
  const events = [
    event("doing"),
    event("verified", {
      sha: "abc",
      verify: { command: "just check", exit: 0 },
    }),
    { at: "2026-01-02T00:00:00.000Z", state: "implementing" },
  ];
  const text = eventsHeader() + events.map(eventLine).join("");
  expect(await readEvents(withLog(text), "c1")).toEqual(events);
});

test("a change with no log gives null", async () => {
  expect(await readEvents(fakeFiles({}), "c1")).toBeNull();
  expect(await scanEvents(fakeFiles({}), "c1")).toBeNull();
});

test("a header with another schema throws, and the message names the file", async () => {
  for (const schema of [1, 3, "2"]) {
    const text = `${JSON.stringify({ schema })}\n`;
    await expect(readEvents(withLog(text), "c1")).rejects.toThrow(
      eventsPath("c1"),
    );
  }
});

test("a log with no header throws", async () => {
  const text = eventLine(event("doing"));
  await expect(readEvents(withLog(text), "c1")).rejects.toThrow();
});

test("a torn last line is skipped and its line number is reported", async () => {
  const text = `${eventsHeader()}${eventLine(event("doing"))}{"at":"2026-01`;
  expect(await scanEvents(withLog(text), "c1")).toEqual({
    events: [event("doing")],
    torn: 3,
  });
});

test("a bad line that is not the last line throws", async () => {
  const text = `${eventsHeader()}{"at":\n${eventLine(event("doing"))}`;
  await expect(readEvents(withLog(text), "c1")).rejects.toThrow();
});

test("a complete last line with a line end is never torn", async () => {
  const text = eventsHeader() + eventLine(event("doing"));
  expect((await scanEvents(withLog(text), "c1"))?.torn).toBeNull();
});

test("the schema number is 2 and the header line carries it", () => {
  expect(SPEC_SCHEMA).toBe(2);
  expect(JSON.parse(eventsHeader())).toEqual({ schema: 2 });
});

const logOf = (states: Record<string, string>): string =>
  eventsHeader() +
  Object.entries(states)
    .map(([pkg, state]) => eventLine(event(state, { package: pkg })))
    .join("");

const CHANGE = ".dotclaude/spec/changes/1.0.0";

const store = fakeFiles({
  [eventsPath("1.0.0")]: logOf({ P01: "done", P99: "doing" }),
  [`${CHANGE}/packages/01-a.md`]: "---\nid: P01\n---\n",
  [`${CHANGE}/packages/24-tiers.md`]: "---\nid: P24\n---\n",
});

test("the state of a package is its last event", () => {
  expect(
    lastStates([
      event("doing"),
      event("verified"),
      { at: "2026-01-01T00:00:00.000Z", state: "planned" },
    ]),
  ).toStrictEqual({ P1: "verified" });
});

test("`packageStates` adds a package with a file as planned and keeps a state with no file", async () => {
  const events = [
    event("done", { package: "P01" }),
    event("doing", { package: "P99" }),
  ];
  expect(await packageStates(store, "1.0.0", events)).toStrictEqual({
    P01: "done",
    P99: "doing",
    P24: "planned",
  });
});

test("`activeProgress` counts a package that has a file and no event", async () => {
  expect(await activeProgress(store)).toStrictEqual({
    id: "1.0.0",
    done: 1,
    total: 3,
  });
});

test("`activeProgress` gives null when every change is done or none has a log", async () => {
  expect(await activeProgress(fakeFiles({}))).toBeNull();
  const done = fakeFiles({
    [eventsPath("a")]: logOf({ P1: "done", P2: "canceled" }),
  });
  expect(await activeProgress(done)).toBeNull();
});

test("`activeProgress` leaves a canceled package out of the total and takes the last open change", async () => {
  const files = fakeFiles({
    [eventsPath("a")]: logOf({ P1: "doing" }),
    [eventsPath("b")]: logOf({ P1: "done", P2: "canceled", P3: "planned" }),
  });
  expect(await activeProgress(files)).toStrictEqual({
    id: "b",
    done: 1,
    total: 2,
  });
});
