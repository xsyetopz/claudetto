// The segment of the active change, on a fixture spec store and on a folder with no store.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileReader } from "../../../src/kernel/node/fs.ts";
import { main } from "../../../src/plugins/dotclaude/slices/statusline/adapters/cli.ts";
import { tmpDir } from "../../support/repo.ts";
import { depsFor, type Run, STATUS } from "./support.ts";

const dir = tmpDir("dc-statusline-change");

/** A project folder with one `events.jsonl` for each entry of `changes`, keyed by change id, and one empty package file for each id in `files`. */
const project = async (
  name: string,
  changes: Record<string, string>,
  files: Record<string, readonly string[]> = {},
): Promise<string> => {
  const root = path.join(dir, name);
  fs.mkdirSync(root, { recursive: true });
  for (const [id, state] of Object.entries(changes)) {
    const folder = path.join(root, ".dotclaude", "spec", "changes", id);
    fs.mkdirSync(folder, { recursive: true });
    await Bun.write(path.join(folder, "events.jsonl"), state);
    for (const pkg of files[id] ?? [])
      await Bun.write(
        path.join(folder, "packages", `${pkg}.md`),
        `---\nid: ${pkg}\n---\n`,
      );
  }
  return root;
};

/** The text of an `events.jsonl`: a header, and one event for each package. */
const state = (states: Record<string, string>, schema = 2): string =>
  [
    { schema },
    ...Object.entries(states).map(([pkg, value]) => ({
      at: "2026-01-01T00:00:00.000Z",
      package: pkg,
      state: value,
    })),
  ]
    .map((line) => JSON.stringify(line))
    .join("\n");

const rowsFor = async (root: string): Promise<Run> => {
  const run: Run = { status: -1, out: [], err: [] };
  const input = {
    ...STATUS,
    workspace: { current_dir: root, project_dir: root },
  };
  run.status = await main(
    [],
    depsFor(input, run, {
      env: { COLUMNS: "124", NO_COLOR: "1" },
      files: fileReader,
    }),
  );
  return run;
};

test("the first row shows the id and the done count of the active change", async () => {
  const root = await project("active", {
    "0.9.0": state({ P01: "done", P02: "done" }),
    "1.0.0": state({
      P01: "done",
      P02: "done",
      P03: "done",
      P04: "done",
      P05: "doing",
      P06: "planned",
    }),
  });
  const run = await rowsFor(root);
  expect(run.err).toStrictEqual([]);
  expect((run.out[0] ?? "").split("\n")[0]).toMatch(
    / · ◆ 1\.0\.0 4\/6 *( ·|$)/,
  );
});

test("a package file with no event counts as `planned` in the total", async () => {
  const root = await project(
    "planned",
    { "1.0.0": state({ P01: "done" }) },
    { "1.0.0": ["P01", "P02", "P03"] },
  );
  const run = await rowsFor(root);
  expect((run.out[0] ?? "").split("\n")[0]).toMatch(
    / · ◆ 1\.0\.0 1\/3 *( ·|$)/,
  );
});

test("a store where every change is done shows no change segment", async () => {
  const root = await project("all-done", { "1.0.0": state({ P01: "done" }) });
  const run = await rowsFor(root);
  expect(run.out[0]).not.toContain("◆");
});

test("a folder with no store shows no change segment and no error", async () => {
  const root = path.join(dir, "no-store");
  fs.mkdirSync(root, { recursive: true });
  const run = await rowsFor(root);
  expect(run.status).toBe(0);
  expect(run.err).toStrictEqual([]);
  expect(run.out[0]).not.toContain("◆");
  expect(run.out[0]).toContain("⌂ no-store");
});

test("a store of another schema shows no change segment, writes the cause to stderr, and keeps the other rows", async () => {
  const root = await project("schema", { "1.0.0": state({ P01: "doing" }, 1) });
  const run = await rowsFor(root);
  expect(run.status).toBe(0);
  expect(run.err.join("")).toContain("events.jsonl");
  expect(run.out[0]).not.toContain("◆");
  expect(run.out[0]).toContain("◈ Opus 5.5");
});
