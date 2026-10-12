// Tests of `packageLanes` and of `activeProgress` for a package file with no lane.

import { expect, test } from "bun:test";
import type { FileReader } from "../../src/kernel/ports.ts";
import {
  activeProgress,
  packageLanes,
  SPEC_SCHEMA,
  statePath,
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

const stateText = (lanes: Record<string, string>) =>
  JSON.stringify({ schema: SPEC_SCHEMA, lanes, events: [], handoff: null });

const files = fakeFiles({
  [statePath("1.0.0")]: stateText({ P01: "done", P99: "doing" }),
  "spec/changes/1.0.0/packages/01-a.md": "---\nid: P01\ndeps: []\n---\n",
  "spec/changes/1.0.0/packages/24-tiers.md": "---\nid: P24\ndeps: []\n---\n",
});

test("`packageLanes` adds a package with a file as planned and keeps a lane with no file", async () => {
  const state = {
    schema: SPEC_SCHEMA,
    lanes: { P01: "done", P99: "doing" },
    events: [],
    handoff: null,
  } as const;
  expect(await packageLanes(files, "1.0.0", state)).toStrictEqual({
    P01: "done",
    P99: "doing",
    P24: "planned",
  });
});

test("`activeProgress` counts a package that has a file and no lane", async () => {
  expect(await activeProgress(files)).toStrictEqual({
    id: "1.0.0",
    done: 1,
    total: 3,
  });
});
