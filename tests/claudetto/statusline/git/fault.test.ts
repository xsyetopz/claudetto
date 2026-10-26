// A `git` failure shows as an error mark with its cause on stderr. A folder that is no repository shows nothing.

import { expect, test } from "bun:test";
import { rowsOf } from "../support.ts";

const runnerOf = (result: object | Error) => ({
  run: () => {
    if (result instanceof Error) throw result;
    return result as {
      exitCode: number | null;
      stdout: string;
      stderr: string;
    };
  },
});

test("a `git` that times out shows the error mark and the timeout on stderr", async () => {
  const { text, run } = await rowsOf(
    {},
    {
      runner: runnerOf({
        exitCode: null,
        stdout: "",
        stderr: "",
        timedOut: true,
      }),
    },
  );
  expect(text).toContain("⎇ ✗");
  expect(run.err.join("")).not.toBe("");
});

test("a `git` that is missing shows the error mark and the cause on stderr", async () => {
  const { text, run } = await rowsOf(
    {},
    { runner: runnerOf(new Error("spawn git ENOENT")) },
  );
  expect(text).toContain("⎇ ✗");
  expect(run.err.join("")).toContain("spawn git ENOENT");
});

test("a `git` that exits with an error inside a repository shows the error mark and its message", async () => {
  const { text, run } = await rowsOf(
    {},
    {
      runner: {
        run: (_cmd, args) =>
          args[0] === "rev-parse"
            ? { exitCode: 0, stdout: ".git\n", stderr: "" }
            : { exitCode: 128, stdout: "", stderr: "fatal: bad object\n" },
      },
    },
  );
  expect(text).toContain("⎇ ✗");
  expect(run.err.join("")).toContain("fatal: bad object");
});

test("a folder that is no repository shows no git segment and no error, with a message in any language", async () => {
  const { text, run } = await rowsOf(
    {},
    {
      runner: runnerOf({
        exitCode: 128,
        stdout: "",
        stderr: "fatal: to nie jest repozytorium git (ani żaden z rodziców)",
      }),
    },
  );
  expect(text).not.toContain("⎇");
  expect(run.err).toStrictEqual([]);
});

test("a `git` that succeeds, or hits the cache, runs no second process", async () => {
  const calls: string[] = [];
  await rowsOf(
    {},
    {
      runner: {
        run: (_cmd, args) => {
          calls.push(args[0] ?? "");
          return { exitCode: 0, stdout: "", stderr: "" };
        },
      },
    },
  );
  expect(calls).not.toContain("rev-parse");
});

test("a cache that cannot be read goes to stderr, and `git` still runs", async () => {
  const { text, run } = await rowsOf(
    {},
    {
      files: {
        read: async () => {
          throw new Error("EIO: cache");
        },
        list: async () => [],
      },
    },
  );
  expect(run.err.join("")).toContain("EIO: cache");
  expect(text).toContain("⎇ main");
});
