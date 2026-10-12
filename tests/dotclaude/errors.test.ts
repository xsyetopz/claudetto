// Error policy of the `dotclaude` plugin: a `catch` handles the error that it expects and passes the others on.
// An expected error is an absent file or a line that is not JSON.
// An unexpected error is a symbolic link that points to itself (`ELOOP`), which the tests make in a folder under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import {
  allRows,
  maxTurnsOf,
} from "../../plugins/dotclaude/features/context/turns.ts";
import { readTable } from "../../plugins/dotclaude/features/statusline/context-table.ts";
import { readUsage } from "../../plugins/dotclaude/features/statusline/credits.ts";
import { parseInput } from "../../plugins/dotclaude/features/statusline/input.ts";
import { openspecChange } from "../../plugins/dotclaude/features/statusline/openspec.ts";
import { tailRows } from "../../plugins/dotclaude/hooks/PostToolUse/context.ts";
import {
  isExpected,
  rethrowUnless,
} from "../../plugins/dotclaude/lib/errors.ts";
import { PLUGINS, tmpDir } from "../support/repo.ts";

const dir = tmpDir("dc-errors");
const absent = path.join(dir, "absent.jsonl");
const loop = path.join(dir, "loop");
fs.symlinkSync(loop, loop);

test("`rethrowUnless` returns for a listed code or name and throws the rest", () => {
  rethrowUnless(Object.assign(new Error("x"), { code: "ENOENT" }), "ENOENT");
  rethrowUnless(new SyntaxError("x"), "SyntaxError");
  const other = new TypeError("x");
  expect(() => rethrowUnless(other, "ENOENT", "SyntaxError")).toThrow(other);
  expect(isExpected(undefined, "ENOENT")).toBe(false);
});

test("the turn count and the tail read give no rows for an absent transcript and throw any other error", async () => {
  expect(await allRows(absent)).toStrictEqual([]);
  expect(await tailRows(absent)).toStrictEqual([]);
  await expect(allRows(loop)).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
  await expect(tailRows(loop)).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
});

test("cut lines are skipped when the rows are read", async () => {
  const file = path.join(dir, "rows.jsonl");
  await Bun.write(file, 'ial"}\n{"type":"assistant"}\n');
  expect(await allRows(file)).toStrictEqual([{ type: "assistant" }]);
  expect(await tailRows(file)).toStrictEqual([{ type: "assistant" }]);
});

test("`maxTurnsOf` gives undefined for an absent agent file and throws any other error", async () => {
  expect(await maxTurnsOf("nobody", dir)).toBe(undefined);
  fs.symlinkSync(
    path.join(dir, "agent-loop.md"),
    path.join(dir, "agent-loop.md"),
  );
  await expect(maxTurnsOf("agent-loop", dir)).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
});

test("`readUsage` gives no usage for an absent file, text that is not JSON, or a cache of another shape", async () => {
  const none = { credits: null, fable: null };
  const home = async (text?: string) => {
    const config = fs.mkdtempSync(path.join(dir, "config-"));
    if (text !== undefined)
      await Bun.write(path.join(config, ".claude.json"), text);
    return { CLAUDE_CONFIG_DIR: config };
  };
  expect(await readUsage(await home(), 1)).toStrictEqual(none);
  expect(await readUsage(await home("{"), 1)).toStrictEqual(none);
  expect(await readUsage(await home("{}"), 1)).toStrictEqual(none);
  expect(
    await readUsage(
      await home('{"cachedUsageUtilization":{"fetchedAtMs":1}}'),
      1,
    ),
  ).toStrictEqual(none);
});

test("`readUsage` throws a read error that is not an absent file", async () => {
  const config = fs.mkdtempSync(path.join(dir, "config-"));
  fs.symlinkSync(
    path.join(config, ".claude.json"),
    path.join(config, ".claude.json"),
  );
  await expect(readUsage({ CLAUDE_CONFIG_DIR: config }, 1)).rejects.toThrow(
    expect.objectContaining({
      code: "ELOOP",
    }),
  );
});

test("`openspecChange` gives null for a project with no changes folder and throws any other error", async () => {
  expect(await openspecChange(path.join(dir, "no-project"))).toBe(null);
  const project = fs.mkdtempSync(path.join(dir, "project-"));
  fs.mkdirSync(path.join(project, "openspec"));
  // On Windows a link has a kind, so a loop to a folder needs `"dir"`, or the link reads as a file.
  fs.symlinkSync(
    path.join(project, "openspec", "changes"),
    path.join(project, "openspec", "changes"),
    "dir",
  );
  await expect(openspecChange(project)).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
});

test("`readTable` gives null for an absent transcript and throws any other error", async () => {
  expect(await readTable({ transcript_path: absent })).toBe(null);
  await expect(readTable({ transcript_path: loop })).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
});

test("`parseInput` gives null for text that is not JSON", () => {
  expect(parseInput("{")).toBe(null);
  expect(parseInput("[]")).toStrictEqual({});
});

test("the status line writes an unexpected error to stderr and still prints one row", () => {
  const script = path.join(PLUGINS, "dotclaude/features/statusline/cli.ts");
  const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
  const run = (input: unknown) => {
    const out = Bun.spawnSync({
      cmd: [process.execPath, "--no-env-file", script],
      stdin: new TextEncoder().encode(JSON.stringify(input)),
      cwd: dir,
      env: { ...process.env, CLAUDE_CONFIG_DIR: dir, COLUMNS: "120" },
    });
    return {
      status: out.exitCode,
      stdout: text(out.stdout),
      stderr: text(out.stderr),
    };
  };
  const bad = run({ transcript_path: loop });
  expect(bad.status).toBe(0);
  expect(bad.stderr).toMatch(/ELOOP/);
  expect(stripVTControlCharacters(bad.stdout).trim()).toBe("");
  const fine = run({ transcript_path: absent });
  expect(fine.stderr).toBe("");
});
