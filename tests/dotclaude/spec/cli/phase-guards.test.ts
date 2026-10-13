// The guards that every command on an open package shares: the state of the change, the log that `approve` reads, and `drop` of a change.

import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  CHANGES,
  eventsOf,
  file,
  frontKey,
  packageIn,
  phase,
  pkgFile,
  plannedChange,
  write,
} from "./run-phase.ts";

const LOG = `${CHANGES}/c1/events.jsonl`;

/** Appends the event line `event` to the log of `c1`, as an edit by hand. */
const append = (root: string, event: object): void =>
  fs.appendFileSync(path.join(root, LOG), `${JSON.stringify(event)}\n`);

describe("a command on an open package in a change that is not open", () => {
  test.each([
    ["doing", ["implement", "P1", "--decision", "fix-code"]],
    ["planned", ["implement", "P1"]],
    ["doing", ["verify", "P1"]],
    ["verified", ["review", "P1", "approve"]],
    ["approved", ["merge", "P1"]],
    ["doing", ["block", "P1", "--note", "n"]],
    ["doing", ["drop", "P1", "--reason", "r"]],
  ] as const)("%s package: %p is refused", async (state, args) => {
    const root =
      state === "planned" ? await plannedChange() : await packageIn(state);
    append(root, { at: "2026-10-13T10:00:00.000Z", state: "canceled" });
    const before = await file(root, LOG);
    const r = await phase(root, ...args);
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain("canceled");
    expect(await file(root, LOG)).toBe(before);
  });
});

describe("approve reads the last verify event", () => {
  test("a verified package whose verify event has no SHA is refused", async () => {
    const root = await packageIn("verified");
    const text = (await file(root, LOG))
      .split("\n")
      .map((l) => l.replace(/,"sha":"[0-9a-f]+"/, ""))
      .join("\n");
    await write(root, LOG, text);
    const r = await phase(root, "review", "P1", "approve");
    expect(r.code).toBe(1);
    expect(await frontKey(root, pkgFile("c1"), "status")).toBe("verified");
  });

  test("a verified package whose last verify event failed is refused", async () => {
    const root = await packageIn("verified");
    await write(
      root,
      LOG,
      (await file(root, LOG)).replace('"exit":0', '"exit":2'),
    );
    expect((await phase(root, "review", "P1", "approve")).code).toBe(1);
  });
});

describe("implement from doing", () => {
  test("a --decision alone is refused when the last event is not a failed verify or a reject", async () => {
    const root = await packageIn("doing");
    const before = await file(root, LOG);
    const r = await phase(root, "implement", "P1", "--decision", "fix-code");
    expect(r.code).toBe(1);
    expect(await file(root, LOG)).toBe(before);
  });
});

describe("drop of a change", () => {
  test("cancels each open package with the same reason, then the change", async () => {
    const root = await plannedChange();
    await write(
      root,
      pkgFile("c1", "P2"),
      (await file(root, pkgFile("c1"))).replace("id: P1", "id: P2"),
    );
    await phase(root, "implement", "P1");
    const r = await phase(root, "drop", "c1", "--reason", "gone");
    expect(r.code).toBe(0);
    const events = await eventsOf(root, "c1");
    for (const pkg of ["P1", "P2"])
      expect(events.filter((e) => e["package"] === pkg).at(-1)).toMatchObject({
        state: "canceled",
        note: "gone",
      });
    expect(events.at(-1)).toMatchObject({ state: "canceled", note: "gone" });
    expect(await frontKey(root, pkgFile("c1", "P2"), "status")).toBe(
      "canceled",
    );
    expect(await frontKey(root, pkgFile("c1"), "status")).toBe("canceled");
  });

  test("leaves a done package done", async () => {
    const root = await packageIn("done");
    expect((await phase(root, "drop", "c1", "--reason", "gone")).code).toBe(0);
    expect(await frontKey(root, pkgFile("c1"), "status")).toBe("done");
  });
});
