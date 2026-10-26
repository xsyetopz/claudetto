// Each file of `tools/` and `dev/` has a caller (spec `repo-tooling`, "No Unused Tool or Test").
// A caller is a recipe of `justfile`, a script of `package.json`, a CI workflow, the Biome config, or a file with a caller that imports the file or names its path.
// A file that is not code, such as a `Dockerfile`, has a caller when a file of its folder has one.

import { expect, test } from "bun:test";
import path from "node:path";
import { parseImports, resolve } from "../support/graph.ts";
import { REPO } from "../support/repo.ts";

/** The source of each file, by its path under the repository. */
type Files = Record<string, string>;

const CODE = /\.(ts|mjs|js)$/;

/** The files of `tools/` and `dev/` in `files` that no caller reaches from the texts of `roots`. */
const orphans = (files: Files, roots: string[]): string[] => {
  const called = new Set<string>();
  const queue: string[] = [];
  const add = (f: string | null) => {
    if (f && f in files && !called.has(f)) called.add(f) && queue.push(f);
  };
  const reach = (text: string) => {
    for (const f of Object.keys(files)) if (text.includes(f)) add(f);
  };
  for (const text of roots) reach(text);
  for (let f = queue.shift(); f !== undefined; f = queue.shift()) {
    const text = files[f] as string;
    reach(text);
    if (CODE.test(f))
      for (const imp of parseImports(text))
        add(imp.dynamic ? null : resolve(f, imp.spec));
  }
  const dirs = new Set([...called].map((f) => path.posix.dirname(f)));
  return Object.keys(files)
    .filter((f) => !called.has(f))
    .filter((f) => CODE.test(f) || !dirs.has(path.posix.dirname(f)))
    .sort();
};

const git = (...args: string[]) =>
  Bun.spawnSync(["git", ...args], { cwd: REPO })
    .stdout.toString()
    .split("\n")
    .filter(Boolean);

const read = (rel: string) => Bun.file(path.join(REPO, rel)).text();

test("each file of `tools/` and `dev/` has a caller", async () => {
  const listed = git("ls-files", "--cached", "--others", "--exclude-standard");
  const files: Files = {};
  for (const f of listed.filter((f) => /^(tools|dev)\//.test(f)))
    if (await Bun.file(path.join(REPO, f)).exists()) files[f] = await read(f);
  const roots = listed.filter((f) =>
    /^(justfile|package\.json|biome\.json|\.github\/workflows\/[^/]+\.ya?ml)$/.test(
      f,
    ),
  );
  expect(roots).toContain("justfile");
  expect(orphans(files, await Promise.all(roots.map(read)))).toEqual([]);
});

test("a file that nothing names or imports is an orphan, and its import and its folder file are not", () => {
  const files = {
    "tools/run.ts": 'import { a } from "./a.ts";',
    "tools/a.ts": "",
    "dev/docker/image.ts": "",
    "dev/docker/Dockerfile": "",
    "dev/yolo/index.ts": "",
    "dev/yolo/notes.txt": "",
  };
  const roots = ["bun tools/run.ts", "bun dev/docker/image.ts"];
  expect(orphans(files, roots)).toEqual([
    "dev/yolo/index.ts",
    "dev/yolo/notes.txt",
  ]);
});
