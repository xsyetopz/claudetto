// Lab tests of the `agents` slice: the `AGENTS` files of the start, the nested files on a read, an edit, a `Bash` read, or a mention,
// the dedupe of the nested files, and the reset of the dedupe on a compaction.
// The hooks sit above the stubs of the engine, and the stubs answer the file walk from one fake disk.
// No file is read from the real disk, and no Claude Code session runs.

import type {
  FsAncestor,
  FsAncestorsRequest,
  InstructionFile,
  On,
} from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

/** One file of the fake disk: the folder it is in, the name it is looked for by, and its text. */
type Disk = {
  readonly dir: string;
  readonly name: string;
  readonly content: string;
};

/** The world of one test. A value left out takes the default of the test folder. */
type World = {
  readonly cwd?: string;
  readonly root?: string;
  readonly disk?: readonly Disk[];
  readonly excludes?: readonly string[];
  readonly dirs?: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly skipCompact?: boolean;
};

const dirOf = (path: string): string =>
  path.slice(0, path.lastIndexOf("/")) || "/";

/** A path as the engine resolves it: `.` is the working directory, and a relative path is under it. */
const resolveIn = (cwd: string, path: string): string => {
  if (path === ".") return cwd;
  return path.startsWith("/") ? path : `${cwd}/${path}`;
};

/**
 * A path of a request in the form of the fake disk.
 * The engine resolves `of` and `below` against the real working directory before the stub gets them.
 * On Windows, `/p/a.ts` then comes as `D:\p\a.ts`, so the drive goes and each `\` becomes `/`.
 */
const diskPath = (path: string): string =>
  path.replace(/^[A-Za-z]:/, "").replaceAll("\\", "/");

/** True when `dir` is `of` or one of its ancestors. */
const isAncestor = (dir: string, of: string): boolean =>
  dir === "/" || dir === of || of.startsWith(`${dir}/`);

/** The fake walk of `$.fs.ancestors`: the folders from the working directory up, or from `of` up to `below`. */
const walkDisk = (
  disk: readonly Disk[],
  cwd: string,
  req: FsAncestorsRequest,
): FsAncestor[] => {
  const target =
    req.of === undefined ? cwd : dirOf(resolveIn(cwd, diskPath(req.of)));
  const below =
    req.below === undefined ? undefined : resolveIn(cwd, diskPath(req.below));
  const inside = (dir: string): boolean =>
    below === undefined || (dir !== below && isAncestor(below, dir));
  return disk
    .filter(
      (file) =>
        req.names.includes(file.name) &&
        isAncestor(file.dir, target) &&
        inside(file.dir),
    )
    .sort(
      (a, b) =>
        a.dir.length - b.dir.length ||
        req.names.indexOf(a.name) - req.names.indexOf(b.name),
    )
    .map((file) => {
      const path = `${file.dir}/${file.name}`;
      return {
        dir: file.dir,
        name: file.name,
        content: file.content,
        parts: [{ path, content: file.content }],
      };
    });
};

/** Stubs for one test. The result counts the file walks that reached the engine. */
const setup = (on: On, world: World = {}) => {
  const cwd = world.cwd ?? "/p";
  const disk = world.disk ?? [];
  const seen = { walks: 0 };
  mock.env(on, { CLAUDE_CONFIG_DIR: "/home/u/.claude", ...world.env });
  on("settings.read", () => ({
    value: {
      claudeMdExcludes: [...(world.excludes ?? [])],
      permissions: { additionalDirectories: [...(world.dirs ?? [])] },
    },
  }));
  on("session.root", () => ({ value: world.root ?? "/p" }));
  on("fs.ancestors", (_$, e) => {
    seen.walks += 1;
    return { value: walkDisk(disk, cwd, e) };
  });
  on("prompt.context", (_$, e) => ({ blocks: e.blocks }));
  on("tool.call", () => ({ result: "ok" }));
  on("prompt.mention", () => ({ type: "file" }));
  on("session.compact", (_$, e) =>
    world.skipCompact
      ? { skip: "Skipped by the test." }
      : { messages: e.messages },
  );
  return seen;
};

/** The files that the start hook adds to the engine's own list, with the list the hook returns. */
const started = async ($: Engine, instructionFiles: InstructionFile[] = []) =>
  (await $.prompt.context({ blocks: [], instructionFiles })).instructionFiles ??
  [];

const paths = (files: readonly { readonly path: string }[]): string[] =>
  files.map((file) => file.path);

const contexts = (out: {
  readonly context?: readonly string[] | undefined;
}): string[] => [...(out.context ?? [])];

const SUB: Disk = { dir: "/p/sub", name: "AGENTS.md", content: "Sub rules." };
const OTHER: Disk = {
  dir: "/p/other",
  name: "AGENTS.md",
  content: "Other rules.",
};

test("the user file, the project and `.claude/` files, and `AGENTS.local.md` load with their tiers", async ($: Engine, on: On) => {
  setup(on, {
    disk: [
      { dir: "/home/u/.claude", name: "AGENTS.md", content: "User rules." },
      { dir: "/p", name: "AGENTS.md", content: "Project rules." },
      { dir: "/p", name: ".claude/AGENTS.md", content: "Claude rules." },
      { dir: "/p", name: "AGENTS.local.md", content: "Local rules." },
    ],
  });
  const files = await started($);
  const kinds = Object.fromEntries(files.map((file) => [file.path, file.kind]));
  expect(kinds).toStrictEqual({
    "/home/u/.claude/AGENTS.md": "user",
    "/p/AGENTS.md": "project",
    "/p/.claude/AGENTS.md": "project",
    "/p/AGENTS.local.md": "local",
  });
});

test("a file that the engine loaded keeps its place and is not loaded again", async ($: Engine, on: On) => {
  setup(on, {
    disk: [{ dir: "/p", name: "AGENTS.md", content: "Project rules." }],
  });
  const files = await started($, [
    { path: "/p/AGENTS.md", kind: "project", content: "Project rules." },
  ]);
  expect(paths(files)).toStrictEqual(["/p/AGENTS.md"]);
});

test("a file with the same text as a loaded file is not loaded", async ($: Engine, on: On) => {
  setup(on, {
    disk: [{ dir: "/p", name: "AGENTS.md", content: "Same text." }],
  });
  const files = await started($, [
    { path: "/p/CLAUDE.md", kind: "project", content: "Same text." },
  ]);
  expect(paths(files)).toStrictEqual(["/p/CLAUDE.md"]);
});

test("a file that a `CLAUDE` file imports loads once", async ($: Engine, on: On) => {
  setup(on, {
    disk: [{ dir: "/p", name: "AGENTS.md", content: "Imported rules." }],
  });
  const files = await started($, [
    { path: "/p/CLAUDE.md", kind: "project", content: "@AGENTS.md" },
    {
      path: "/p/AGENTS.md",
      kind: "project",
      content: "Imported rules.",
      parent: "/p/CLAUDE.md",
    },
  ]);
  expect(paths(files)).toStrictEqual(["/p/CLAUDE.md", "/p/AGENTS.md"]);
});

test("a file that `claudeMdExcludes` matches is not loaded", async ($: Engine, on: On) => {
  setup(on, {
    excludes: ["/p/AGENTS.md", "**/.claude/AGENTS.md"],
    disk: [
      { dir: "/p", name: "AGENTS.md", content: "Excluded." },
      { dir: "/p", name: ".claude/AGENTS.md", content: "Excluded too." },
      { dir: "/p", name: "AGENTS.local.md", content: "Kept." },
    ],
  });
  const files = await started($);
  expect(paths(files)).toStrictEqual(["/p/AGENTS.local.md"]);
});

const EXTRA: Disk = {
  dir: "/extra",
  name: ".claude/AGENTS.md",
  content: "Extra rules.",
};

test("the folders of the added directories stay unloaded without their variable", async ($: Engine, on: On) => {
  setup(on, { dirs: ["/extra"], disk: [EXTRA] });
  expect(paths(await started($))).toStrictEqual([]);
});

test("the folders of the added directories load with their variable", async ($: Engine, on: On) => {
  setup(on, {
    dirs: ["/extra"],
    disk: [EXTRA],
    env: { CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD: "1" },
  });
  expect(paths(await started($))).toStrictEqual(["/extra/.claude/AGENTS.md"]);
});

test("a rewrite of `claudeMd` above the hook adds no file and walks no folder", async ($: Engine, on: On) => {
  const seen = setup(on, {
    disk: [{ dir: "/p", name: "AGENTS.md", content: "Project." }],
  });
  const out = await $.prompt.context({ blocks: [] });
  expect(out.instructionFiles).toBeUndefined();
  expect(seen.walks).toBe(0);
});

test("a nested file loads on a `Read` of a file in its folder, once", async ($: Engine, on: On) => {
  setup(on, { disk: [SUB] });
  const first = await $.tool.call({ tool: "Read", file_path: "/p/sub/x.ts" });
  expect(contexts(first).length).toBe(1);
  expect(contexts(first)[0]).toContain("/p/sub/AGENTS.md");
  expect(contexts(first)[0]).toContain("Sub rules.");
  const second = await $.tool.call({ tool: "Read", file_path: "/p/sub/x.ts" });
  expect(second.context).toBeUndefined();
});

test("a nested file loads on an `Edit` of a file in its folder", async ($: Engine, on: On) => {
  setup(on, { disk: [SUB] });
  const out = await $.tool.call({
    tool: "Edit",
    file_path: "/p/sub/x.ts",
    old_string: "a",
    new_string: "b",
  });
  expect(contexts(out).length).toBe(1);
});

test("a nested file loads on a `Write` to a file in its folder", async ($: Engine, on: On) => {
  setup(on, { disk: [OTHER] });
  const out = await $.tool.call({
    tool: "Write",
    file_path: "/p/other/y.ts",
    content: "x",
  });
  expect(contexts(out).length).toBe(1);
});

test("a nested file loads on a `Bash` read of a file in its folder", async ($: Engine, on: On) => {
  setup(on, { disk: [SUB] });
  const out = await $.tool.call({
    tool: "Bash",
    command: "cat /p/sub/x.ts | head -5",
  });
  expect(contexts(out).length).toBe(1);
  expect(contexts(out)[0]).toContain("Sub rules.");
});

test("a `Bash` command that reads no file loads no nested file", async ($: Engine, on: On) => {
  setup(on, { disk: [SUB] });
  const out = await $.tool.call({ tool: "Bash", command: "ls sub" });
  expect(out.context).toBeUndefined();
});

test("a nested file loads on a mention of a file in its folder", async ($: Engine, on: On) => {
  setup(on, { disk: [SUB] });
  const out = await $.prompt.mention({
    mention: "sub/x.ts",
    path: "/p/sub/x.ts",
  });
  expect(contexts(out).length).toBe(1);
  expect(contexts(out)[0]).toContain("/p/sub/AGENTS.md");
});

test("a nested file loads again after a compaction", async ($: Engine, on: On) => {
  setup(on, { disk: [SUB] });
  expect(
    contexts(await $.tool.call({ tool: "Read", file_path: "/p/sub/x.ts" }))
      .length,
  ).toBe(1);
  expect(
    (await $.tool.call({ tool: "Read", file_path: "/p/sub/x.ts" })).context,
  ).toBeUndefined();
  await $.session.compact({
    trigger: "auto",
    messages: [{ role: "user", text: "Read sub/x.ts.", toolUses: [] }],
  });
  expect(
    contexts(await $.tool.call({ tool: "Read", file_path: "/p/sub/x.ts" }))
      .length,
  ).toBe(1);
});

test("a nested file below the session root loads after a shell `cd` into a subfolder", async ($: Engine, on: On) => {
  setup(on, { cwd: "/p/sub", root: "/p", disk: [OTHER] });
  const out = await $.tool.call({ tool: "Read", file_path: "/p/other/y.ts" });
  expect(contexts(out).length).toBe(1);
  expect(contexts(out)[0]).toContain("/p/other/AGENTS.md");
});

test("a mention of a file in a folder with no `AGENTS` file adds no context", async ($: Engine, on: On) => {
  setup(on, { disk: [SUB] });
  const out = await $.prompt.mention({
    mention: "other/y.ts",
    path: "/p/other/y.ts",
  });
  expect(out.context).toBeUndefined();
});

test("a compaction that a hook skips keeps the dedupe of the nested files", async ($: Engine, on: On) => {
  setup(on, { disk: [SUB], skipCompact: true });
  expect(
    contexts(await $.tool.call({ tool: "Read", file_path: "/p/sub/x.ts" }))
      .length,
  ).toBe(1);
  await $.session.compact({
    trigger: "auto",
    messages: [{ role: "user", text: "Read sub/x.ts.", toolUses: [] }],
  });
  expect(
    (await $.tool.call({ tool: "Read", file_path: "/p/sub/x.ts" })).context,
  ).toBeUndefined();
});
