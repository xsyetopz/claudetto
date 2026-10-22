// `just generate`: each page of `wiki/` comes from `src/wiki/`, with the values and the snippets of `plugins/`.

import { expect, test } from "bun:test";
import path from "node:path";
import { SNIPPET } from "../../plugins/claudetto/snippets.ts";
import {
  fill,
  GENERATED_MARK,
  pages,
  problems,
  VALUES,
} from "../../tools/generate/wiki.ts";
import { REPO, tmpDir } from "../support/repo.ts";

/** A root with the files `files`, each path relative to the root. */
const root = async (files: Record<string, string>): Promise<string> => {
  const dir = tmpDir("wiki");
  for (const [rel, text] of Object.entries(files))
    await Bun.write(path.join(dir, rel), text);
  return dir;
};

test("a value and a snippet include are filled in, and an unknown name throws", () => {
  expect(fill("{{CONTEXT_WINDOW}}", "x.md")).toBe(
    VALUES["CONTEXT_WINDOW"] as string,
  );
  expect(JSON.parse(fill("{{include snippet.json}}", "x.md"))).toEqual(SNIPPET);
  expect(() => fill("{{NO_SUCH}}", "x.md")).toThrow("x.md: no value");
  expect(() => fill("{{include none.json}}", "x.md")).toThrow(
    "x.md: no include",
  );
});

test("a page gets the header, inside its frontmatter when it has one", async () => {
  const dir = await root({
    "src/wiki/A.md": "# A\n",
    "src/wiki/B.md": "---\ntitle: B\n---\n\n# B\n",
  });
  const [a, b] = await pages(dir);
  expect(a?.text.startsWith(`<!-- ${GENERATED_MARK} \`src/wiki/A.md\``)).toBe(
    true,
  );
  expect(b?.text.startsWith(`---\n# ${GENERATED_MARK} \`src/wiki/B.md\``)).toBe(
    true,
  );
});

test("the check names a stale page and a page with no source", async () => {
  const dir = await root({
    "src/wiki/A.md": "# A\n",
    "wiki/A.md": "old\n",
    "wiki/C.md": "x\n",
  });
  expect(await problems(dir)).toEqual([
    "wiki/A.md differs from its source src/wiki/A.md. Edit the source and run `just generate`.",
    "wiki/C.md has no source in src/wiki/.",
  ]);
});

test("the wiki of the repository equals its source", async () => {
  expect(await problems(REPO)).toEqual([]);
});
