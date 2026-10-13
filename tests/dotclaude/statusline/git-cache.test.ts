// The git cache of the `statusline` slice: a `git status` result stays for `GIT_CACHE_MS`, in a file of the temp folder.
// The clock, the files, and the `git` runner are fakes, so that no file is written and no `git` runs.

import { expect, test } from "bun:test";
import os from "node:os";
import { main } from "../../../src/plugins/dotclaude/slices/statusline/adapters/cli.ts";
import {
  GIT_CACHE_MS,
  REFRESH_SECONDS,
} from "../../../src/plugins/dotclaude/slices/statusline/limits.ts";
import { depsFor, GIT_TEXT, NOW, type Run, STATUS } from "./support.ts";

/** A fake of the files of a run: `write` stores the text, and `read` gives it back, or null for a missing file. */
const memoryFiles = () => {
  const files = new Map<string, string>();
  return {
    files,
    reader: {
      read: async (file: string) => files.get(file) ?? null,
      list: async () => [],
    },
    write: async (file: string, text: string) => {
      files.set(file, text);
    },
  };
};

test("a run inside `GIT_CACHE_MS` runs no `git`, and a run after it runs `git` again", async () => {
  const memory = memoryFiles();
  let clock = NOW;
  let gitRuns = 0;
  const runner = {
    run: () => {
      gitRuns++;
      return { exitCode: 0, stdout: GIT_TEXT, stderr: "" };
    },
  };
  const runAt = async (at: number): Promise<Run> => {
    clock = at;
    const run: Run = { status: -1, out: [], err: [] };
    run.status = await main(
      [],
      depsFor(STATUS, run, {
        env: { COLUMNS: "124", NO_COLOR: "1" },
        now: () => clock,
        files: memory.reader,
        write: memory.write,
        runner,
      }),
    );
    return run;
  };

  await runAt(NOW);
  expect(gitRuns).toBe(1);

  const refresh = await runAt(NOW + REFRESH_SECONDS * 1000);
  expect(gitRuns).toBe(1);
  expect(refresh.out[0]).toContain("main");

  await runAt(NOW + GIT_CACHE_MS);
  expect(gitRuns).toBe(2);
});

test("the cache of a repository is not used by another repository", async () => {
  const memory = memoryFiles();
  let gitRuns = 0;
  const runner = {
    run: () => {
      gitRuns++;
      return { exitCode: 0, stdout: GIT_TEXT, stderr: "" };
    },
  };
  const other = {
    ...STATUS,
    workspace: { current_dir: "/work/other", project_dir: "/work/other" },
  };
  for (const input of [STATUS, other]) {
    const run: Run = { status: -1, out: [], err: [] };
    await main(
      [],
      depsFor(input, run, {
        env: { COLUMNS: "124", NO_COLOR: "1" },
        files: memory.reader,
        write: memory.write,
        runner,
      }),
    );
  }
  expect(gitRuns).toBe(2);
});

test("the cache file is in the temp folder and does not name the repository path", async () => {
  const memory = memoryFiles();
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    [],
    depsFor(STATUS, run, {
      env: { COLUMNS: "124", NO_COLOR: "1" },
      files: memory.reader,
      write: memory.write,
    }),
  );
  const cached = [...memory.files.keys()].filter((file) =>
    file.includes("dotclaude-git-"),
  );
  expect(cached.length).toBe(1);
  expect(cached[0]?.startsWith(os.tmpdir())).toBe(true);
  expect(cached[0]).not.toContain("/work/dotclaude");
});
