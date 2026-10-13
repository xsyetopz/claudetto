// Tests of the schema 2 event reader, with a fake `FileReader` and no file on disk.

import { expect, test } from "bun:test";
import type { FileReader } from "../../src/kernel/ports.ts";
import {
  eventLine2,
  eventsHeader2,
  eventsPath2,
  readStateEvents,
  SPEC_SCHEMA_2,
  type StateEvent,
  scanStateEvents,
} from "../../src/kernel/state-events.ts";

const fakeFiles = (files: Record<string, string>): FileReader => ({
  read: async (file) => files[file] ?? null,
  list: async () => [],
});

const event = (state: string, extra: Partial<StateEvent> = {}): StateEvent => ({
  at: "2026-01-01T00:00:00.000Z",
  package: "P1",
  state,
  ...extra,
});

const withLog = (text: string): FileReader =>
  fakeFiles({ [eventsPath2("c1")]: text });

test("the header and the lines round-trip through the reader", async () => {
  const events = [
    event("doing"),
    event("verified", {
      sha: "abc",
      verify: { command: "just check", exit: 0 },
    }),
    { at: "2026-01-02T00:00:00.000Z", state: "implementing" },
  ];
  const text = eventsHeader2() + events.map(eventLine2).join("");
  expect(await readStateEvents(withLog(text), "c1")).toEqual(events);
});

test("a change with no log gives null", async () => {
  expect(await readStateEvents(fakeFiles({}), "c1")).toBeNull();
  expect(await scanStateEvents(fakeFiles({}), "c1")).toBeNull();
});

test("a header with another schema throws, and the message names the file", async () => {
  for (const schema of [1, 3, "2"]) {
    const text = `${JSON.stringify({ schema })}\n`;
    await expect(readStateEvents(withLog(text), "c1")).rejects.toThrow(
      eventsPath2("c1"),
    );
  }
});

test("a log with no header throws", async () => {
  const text = eventLine2(event("doing"));
  await expect(readStateEvents(withLog(text), "c1")).rejects.toThrow();
});

test("a torn last line is skipped and its line number is reported", async () => {
  const text = `${eventsHeader2()}${eventLine2(event("doing"))}{"at":"2026-01`;
  expect(await scanStateEvents(withLog(text), "c1")).toEqual({
    events: [event("doing")],
    torn: 3,
  });
});

test("a bad line that is not the last line throws", async () => {
  const text = `${eventsHeader2()}{"at":\n${eventLine2(event("doing"))}`;
  await expect(readStateEvents(withLog(text), "c1")).rejects.toThrow();
});

test("a complete last line with a line end is never torn", async () => {
  const text = eventsHeader2() + eventLine2(event("doing"));
  expect((await scanStateEvents(withLog(text), "c1"))?.torn).toBeNull();
});

test("the schema number is 2 and the header line carries it", () => {
  expect(SPEC_SCHEMA_2).toBe(2);
  expect(JSON.parse(eventsHeader2())).toEqual({ schema: 2 });
});
