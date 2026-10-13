// The git cache of the `statusline` slice: a `git status` result stays for `GIT_CACHE_MS`, in a file of the temp folder.
// The clock, the files, and the `git` runner are fakes, so that no file is written and no `git` runs.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../../../src/plugins/dotclaude/slices/statusline/adapters/cli.ts";
import { cacheFile } from "../../../src/plugins/dotclaude/slices/statusline/adapters/git-cache.ts";
import {
  GIT_CACHE_MS,
  REFRESH_SECONDS,
} from "../../../src/plugins/dotclaude/slices/statusline/limits.ts";
import { depsFor, GIT_TEXT, NOW, type Run, STATUS } from "./support.ts";

/** A fake of the files of a run: `write` stores the text, and `read` gives it back, or `null` for a missing file. */
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
  // A JSONL file: one record on one line, with a line end.
  expect(cached[0]?.endsWith(".jsonl")).toBe(true);
  const text = memory.files.get(cached[0] ?? "") ?? "";
  expect(text.endsWith("\n")).toBe(true);
  expect(text.trimEnd()).not.toContain("\n");
});

/** Runs the status line once with a saved cache `text` for the repository of `STATUS`, and counts the `git` runs. */
const runWithSaved = async (
  text: string,
): Promise<{ gitRuns: number; out: string }> => {
  const memory = memoryFiles();
  const file = cacheFile(STATUS.workspace.current_dir);
  if (file === null) throw new Error("the test needs a cache folder");
  memory.files.set(file, text);
  let gitRuns = 0;
  const runner = {
    run: () => {
      gitRuns++;
      return { exitCode: 0, stdout: GIT_TEXT, stderr: "" };
    },
  };
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    [],
    depsFor(STATUS, run, {
      env: { COLUMNS: "124", NO_COLOR: "1" },
      now: () => NOW,
      files: memory.reader,
      write: memory.write,
      runner,
    }),
  );
  return { gitRuns, out: run.out.join("\n") };
};

test("a cache file with a wrong field type is no cache, and `git` runs", async () => {
  const saved = JSON.stringify({
    at: NOW,
    state: { branch: 7, dirty: 0, ahead: 0, behind: 0 },
  });
  const { gitRuns } = await runWithSaved(saved);
  expect(gitRuns).toBe(1);
});

test("a torn, empty, or non-object cache file is no cache, and the status line still shows", async () => {
  for (const damaged of ["", '{"at":', "null", "5", "[]"]) {
    const { gitRuns, out } = await runWithSaved(damaged);
    expect(gitRuns).toBe(1);
    expect(out).toContain("⌂ dotclaude");
  }
});

/** The mode bits of a folder exist on POSIX only, so a test of them does not run on Windows. */
const posixTest = test.skipIf(process.platform === "win32");

posixTest(
  "a cache folder with group or other mode bits is no cache folder",
  () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "git-cache-"));
    const folder = path.join(root, `dotclaude-git-${process.getuid?.()}`);
    fs.mkdirSync(folder);
    fs.chmodSync(folder, 0o755);
    expect(cacheFile(STATUS.workspace.current_dir, root)).toBeNull();
  },
);

posixTest("a missing cache folder is made with mode `0700` and used", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "git-cache-"));
  const file = cacheFile(STATUS.workspace.current_dir, root);
  const folder = path.dirname(file ?? "");
  expect(path.dirname(folder)).toBe(root);
  expect(fs.statSync(folder).mode & 0o777).toBe(0o700);
});

test("with no user id, as on Windows, the cache folder is `dotclaude-git` in the temp folder", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "git-cache-"));
  const file = cacheFile(STATUS.workspace.current_dir, root, null);
  expect(file === null ? null : path.dirname(file)).toBe(
    path.join(root, "dotclaude-git"),
  );
});

test("with no user id, a link in place of the cache folder is no cache folder", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "git-cache-"));
  fs.symlinkSync(root, path.join(root, "dotclaude-git"));
  expect(cacheFile(STATUS.workspace.current_dir, root, null)).toBeNull();
});

test("a cache file whose branch holds terminal escape codes is no cache, and `git` runs", async () => {
  const forged = JSON.stringify({
    at: NOW,
    state: {
      branch: "\u001b]0;pwned\u0007main",
      dirty: 0,
      ahead: 0,
      behind: 0,
    },
  });
  const { gitRuns, out } = await runWithSaved(forged);
  expect(gitRuns).toBe(1);
  expect(out).not.toContain("\u001b");
});
