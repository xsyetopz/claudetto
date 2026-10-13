// `archive` leaves the store as it was when a step fails, so that a retry works, and refuses a repeated requirement ID.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { archiveCommand } from "../../../../src/plugins/dotclaude/slices/spec/adapters/archive.ts";
import { SpecStore } from "../../../../src/plugins/dotclaude/slices/spec/adapters/store.ts";
import {
  CHANGES,
  file,
  frontKey,
  packageIn,
  phase,
  write,
} from "./run-phase.ts";

/** A store whose move of a folder fails, as a rename fails on a full disk or a locked folder. */
class FailingMove extends SpecStore {
  override move(): void {
    throw new Error("The rename failed.");
  }
}

const SPEC = ".dotclaude/spec/specs/c1.md";
const ARCHIVE = `${CHANGES}/archive`;

/** An accepted trivial change. */
const accepted = async (): Promise<string> => {
  const root = await packageIn("done");
  await phase(root, "accept", "c1");
  return root;
};

test("a move that fails leaves the spec and the log as they were, and a retry works", async () => {
  const root = await accepted();
  const log = await file(root, `${CHANGES}/c1/events.jsonl`);
  const failed = await archiveCommand(
    {
      store: new FailingMove(root),
      io: { log: () => {}, error: () => {} },
      clock: { now: () => new Date("2026-10-13T10:00:00.000Z") },
    },
    ["c1"],
  );
  expect(failed).toBe(1);
  expect(fs.existsSync(path.join(root, ARCHIVE, "2026-10-13-c1"))).toBe(false);
  expect(fs.existsSync(path.join(root, SPEC))).toBe(false);
  expect(await file(root, `${CHANGES}/c1/events.jsonl`)).toBe(log);
  expect(await frontKey(root, `${CHANGES}/c1/change.md`, "status")).toBe(
    "accepted",
  );
  const retry = await phase(root, "archive", "c1");
  expect(retry.err).toEqual([]);
  expect(retry.code).toBe(0);
  expect(await file(root, SPEC)).toContain("### REQ-1:");
  expect(fs.existsSync(path.join(root, `${CHANGES}/c1`))).toBe(false);
});

test("a change with two blocks of one requirement ID is refused and nothing changes", async () => {
  const root = await accepted();
  const change = await file(root, `${CHANGES}/c1/change.md`);
  const block = /### REQ-1:[\s\S]*?(?=\n## |\n### |$)/.exec(change)?.[0] ?? "";
  expect(block).not.toBe("");
  await write(
    root,
    `${CHANGES}/c1/change.md`,
    `${change.trimEnd()}\n\n${block}\n`,
  );
  const r = await phase(root, "archive", "c1");
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("REQ-1");
  expect(fs.existsSync(path.join(root, SPEC))).toBe(false);
  expect(fs.existsSync(path.join(root, `${CHANGES}/c1`))).toBe(true);
  expect(await frontKey(root, `${CHANGES}/c1/change.md`, "status")).toBe(
    "accepted",
  );
});
