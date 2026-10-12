// `archive`: a pass applies the deltas and moves the change, and one failing delta changes no file.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  DELTA_ADD_BETA,
  DELTA_REMOVE_MISSING,
  has,
  makeStore,
  read,
  run,
  SPEC,
  TODAY,
} from "./helpers.ts";

const CHANGE = ".dotclaude/spec/changes/c1";

/** Every file under `root`, with its text, for a before-and-after compare. */
const snapshot = async (root: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (dir: string): Promise<void> => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out[path.relative(root, full)] = await Bun.file(full).text();
    }
  };
  await walk(root);
  return out;
};

test("archive applies a delta, replaces the spec, and moves the change", async () => {
  const root = await makeStore({
    ".dotclaude/spec/specs/store.md": SPEC,
    [`${CHANGE}/change.md`]: "# c1\n",
    [`${CHANGE}/specs/store.md`]: DELTA_ADD_BETA,
  });
  const r = await run(root, "archive", "c1");
  expect(r.code).toBe(0);
  const spec = await read(root, ".dotclaude/spec/specs/store.md");
  expect(spec).toContain("### Requirement: Alpha");
  expect(spec).toContain("### Requirement: Beta");
  expect(has(root, CHANGE)).toBe(false);
  expect(
    has(root, `.dotclaude/spec/changes/archive/${TODAY}-c1/change.md`),
  ).toBe(true);
  expect(has(root, ".dotclaude/spec/.specs-new")).toBe(false);
  expect(has(root, ".dotclaude/spec/.specs-old")).toBe(false);
  expect((await run(root, "validate")).code).toBe(0);
});

test("archive creates a spec for a new capability", async () => {
  const root = await makeStore({
    [`${CHANGE}/specs/store.md`]: DELTA_ADD_BETA,
  });
  expect((await run(root, "archive", "c1")).code).toBe(0);
  expect(await read(root, ".dotclaude/spec/specs/store.md")).toContain(
    "### Requirement: Beta",
  );
});

test("archive with one failing delta changes no file", async () => {
  const root = await makeStore({
    ".dotclaude/spec/specs/store.md": SPEC,
    ".dotclaude/spec/specs/other.md": SPEC,
    [`${CHANGE}/change.md`]: "# c1\n",
    [`${CHANGE}/specs/other.md`]: DELTA_ADD_BETA,
    [`${CHANGE}/specs/store.md`]: DELTA_REMOVE_MISSING,
  });
  const before = await snapshot(root);
  const r = await run(root, "archive", "c1");
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("Missing");
  expect(await snapshot(root)).toStrictEqual(before);
});

test("archive stops on a missing change, a missing id, and an archive of the same day", async () => {
  const root = await makeStore({
    [`${CHANGE}/specs/store.md`]: DELTA_ADD_BETA,
    [`.dotclaude/spec/changes/archive/${TODAY}-c1/change.md`]: "# old\n",
  });
  expect((await run(root, "archive", "nope")).code).toBe(1);
  expect((await run(root, "archive")).code).toBe(2);
  const before = await snapshot(root);
  expect((await run(root, "archive", "c1")).code).toBe(1);
  expect(await snapshot(root)).toStrictEqual(before);
});
