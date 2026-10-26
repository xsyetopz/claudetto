// Lab tests of the `.gitignore` step of the `session.sweep` hook (the user, 2026-10-26): at `session.start`, a project with `.git` gets the entry `/.claudetto/` in `.gitignore` when no entry covers the folder.
// The file is self-contained, because a lab test cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { ran } from "./stubs/process.ts";

/** Stubs a project `/p` with the files `files`, and gives the texts that `fs.write` got for each path. */
const stub = (on: On, files: Record<string, string>) => {
  const writes: Record<string, string> = {};
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("env.get", () => ({ value: undefined }));
  on("session.id", () => ({ value: "s1" }));
  on("session.root", () => ({ value: "/p" }));
  on("settings.read", () => ({ value: {} }));
  on("fs.stat", () => ({ deny: "ENOENT" }));
  on("fs.exists", (_$, e) => ({ value: e.path in files }));
  on("fs.read", (_$, e) =>
    e.path in files ? { value: files[e.path] ?? "" } : { deny: "ENOENT" },
  );
  on("fs.write", (_$, e) => {
    writes[e.path] = e.text;
    return { value: undefined };
  });
  on("process.run", () => ran("", 128));
  on("ui.log", () => ({ value: undefined }));
  return writes;
};

const start = ($: Engine) =>
  $.session.start({ cwd: "/p", surface: "terminal", isInteractive: true });

test("Gitignore Created: a project with `.git` and no `.gitignore` gets one with `/.claudetto/`", async ($: Engine, on: On) => {
  const writes = stub(on, { "/p/.git": "" });
  await start($);
  expect(writes["/p/.gitignore"]?.split("\n")).toContain("/.claudetto/");
});

test("Gitignore Appended: the lines of the user stay, and `/.claudetto/` comes after them", async ($: Engine, on: On) => {
  const writes = stub(on, {
    "/p/.git": "",
    "/p/.gitignore": "node_modules/\n",
  });
  await start($);
  const text = writes["/p/.gitignore"] ?? "";
  expect(text.startsWith("node_modules/\n")).toBe(true);
  expect(text.split("\n")).toContain("/.claudetto/");
});

for (const entry of [
  ".claudetto",
  ".claudetto/",
  "/.claudetto",
  "/.claudetto/",
  "/.claudetto/**",
  "**/.claudetto/",
])
  test(`Gitignore Kept: the entry \`${entry}\` already covers the folder, so no write`, async ($: Engine, on: On) => {
    const writes = stub(on, {
      "/p/.git": "",
      "/p/.gitignore": `x\n${entry}\n`,
    });
    await start($);
    expect(writes["/p/.gitignore"]).toBeUndefined();
  });

test("Gitignore No Git: a folder with no `.git` gets no `.gitignore`", async ($: Engine, on: On) => {
  const writes = stub(on, {});
  await start($);
  expect(writes["/p/.gitignore"]).toBeUndefined();
});
