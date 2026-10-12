// Tests of `packageLanes` and of `activeProgress` for a package file with no lane.

import { expect, test } from "bun:test";
import type { FileReader } from "../../src/kernel/ports.ts";
import {
  activeProgress,
  eventsPath,
  packageLanes,
  SPEC_SCHEMA,
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

const eventsText = (lanes: Record<string, string>) =>
  [
    { schema: SPEC_SCHEMA },
    ...Object.entries(lanes).map(([pkg, lane]) => ({
      at: "2026-01-01T00:00:00.000Z",
      package: pkg,
      lane,
    })),
  ]
    .map((line) => JSON.stringify(line))
    .join("\n");

const files = fakeFiles({
  [eventsPath("1.0.0")]: eventsText({ P01: "done", P99: "doing" }),
  ".dotclaude/spec/changes/1.0.0/packages/01-a.md":
    "---\nid: P01\ndeps: []\n---\n",
  ".dotclaude/spec/changes/1.0.0/packages/24-tiers.md":
    "---\nid: P24\ndeps: []\n---\n",
});

test("`packageLanes` adds a package with a file as planned and keeps a lane with no file", async () => {
  const events = [
    { at: "t", package: "P01", lane: "done" },
    { at: "t", package: "P99", lane: "doing" },
  ] as const;
  expect(await packageLanes(files, "1.0.0", events)).toStrictEqual({
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
