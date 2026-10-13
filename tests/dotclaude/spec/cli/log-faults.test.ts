// `events.jsonl` faults: a line that is not JSON, a schema that is not known, a torn last line, and a package that two changes have.

import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { run } from "./read-fixture.ts";
import {
  CHANGES,
  eventsOf,
  file,
  git,
  phase,
  plannedChange,
  write,
} from "./run-phase.ts";

const LOG = `${CHANGES}/c1/events.jsonl`;

describe("a log that cannot be read", () => {
  test("a line that is not JSON stops the command, names the file and the line, and keeps the log", async () => {
    const root = await plannedChange();
    const text = (await file(root, LOG)).replace(/\n$/, '\n{"package":\n');
    await write(
      root,
      LOG,
      `${text}{"at":"2026-10-13T10:00:00.000Z","state":"planned"}\n`,
    );
    const before = await file(root, LOG);
    const r = await run(root, "implement", "P1");
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain(`${LOG}:`);
    expect(await file(root, LOG)).toBe(before);
  });

  test("a schema that is not known stops the command and keeps the log", async () => {
    const root = await plannedChange();
    const before = await file(root, LOG);
    await write(root, LOG, before.replace('{"schema":2}', '{"schema":3}'));
    const changed = await file(root, LOG);
    const r = await run(root, "implement", "P1");
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain("schema");
    expect(await file(root, LOG)).toBe(changed);
  });

  test("a torn last line is cut off by the next move, and the move is written", async () => {
    const root = await plannedChange();
    await write(root, LOG, `${await file(root, LOG)}{"at":"2026`);
    const r = await phase(root, "implement", "P1");
    expect(r.code).toBe(0);
    const states = (await eventsOf(root, "c1")).map((e) => e["state"]);
    expect(states.at(-1)).toBe("doing");
    expect((await file(root, LOG)).endsWith("\n")).toBe(true);
  });
});

describe("a package that two changes have", () => {
  const twoChanges = async (): Promise<string> => {
    const root = await plannedChange("c1");
    await phase(root, "specify", "c2", "--size", "trivial");
    await phase(root, "specify", "c2");
    // `specify` gives c2 the package `P2`, so the test renames it to `P1` to make the clash.
    const dir = `${CHANGES}/c2`;
    const text = (await file(root, `${dir}/packages/P2.md`)).replace(
      "id: P2",
      "id: P1",
    );
    fs.rmSync(path.join(root, `${dir}/packages/P2.md`));
    await write(root, `${dir}/packages/P1.md`, text);
    await write(
      root,
      `${dir}/events.jsonl`,
      (await file(root, `${dir}/events.jsonl`)).replaceAll("P2", "P1"),
    );
    git(root, "add", "-A");
    return root;
  };

  test("a move of an ambiguous package is refused and changes no log", async () => {
    const root = await twoChanges();
    const before = [
      await file(root, LOG),
      await file(root, `${CHANGES}/c2/events.jsonl`),
    ];
    const r = await phase(root, "implement", "P1");
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain("c1");
    expect(r.err.join("\n")).toContain("c2");
    expect([
      await file(root, LOG),
      await file(root, `${CHANGES}/c2/events.jsonl`),
    ]).toEqual(before);
  });
});
