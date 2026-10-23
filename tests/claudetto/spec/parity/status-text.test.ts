// The text of `minispec status` against `openspec status` 1.14.3: the checklist has the same shape.
// The `Next:` line differs on purpose, because `minispec` names a skill and not an `openspec` command.

import { expect, test } from "bun:test";
import { OPENSPEC_RUN_TIMEOUT_MS } from "../../../../tools/limits.ts";
import {
  minispec,
  openspec,
  SAMPLE_CHANGES,
  sampleProject,
} from "../../../support/openspec.ts";

/** The lines of the checklist: all but the path of the change root and the `Next:` line. */
const checklist = (out: string): string[] =>
  out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^(Change root:|Next:|- Loading)/.test(l));

test.each(Object.values(SAMPLE_CHANGES))(
  "`status` of %s has the checklist of OpenSpec",
  async (change) => {
    const root = await sampleProject(["story", "task", "epic"]);
    const args = ["status", "--change", change];
    const os = await openspec(root, args);
    const ms = await minispec(root, args);
    expect(ms.code).toBe(os.code);
    expect(checklist(ms.out)).toEqual(checklist(os.out));
    expect(ms.out).not.toStartWith("{");
  },
  OPENSPEC_RUN_TIMEOUT_MS,
);
