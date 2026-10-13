// `archive` keeps the text of a requirement, refuses an id that is not a change id, and changes no file when it cannot move the change.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  CHANGES,
  file,
  makeRepo,
  phase,
  setVerify,
  write,
} from "./run-phase.ts";

const SPEC = ".dotclaude/spec/specs/c1.md";
const REQUIREMENTS = `${CHANGES}/c1/requirements/c1.md`;

const RICH = `

### REQ-2: Rich text

The store MUST keep rich text.

The second paragraph stays.

- a nested list:
  - nested item

\`\`\`text
# a comment
\`\`\`
`;

/** An accepted medium change whose requirements file has the rich requirement. */
const acceptedRich = async (): Promise<string> => {
  const root = makeRepo();
  await phase(root, "specify", "c1");
  await write(root, REQUIREMENTS, (await file(root, REQUIREMENTS)) + RICH);
  await phase(root, "specify", "c1");
  await setVerify(root, "c1", "true");
  for (const args of [
    ["implement", "P1"],
    ["verify", "P1"],
    ["review", "P1", "approve"],
    ["merge", "P1"],
    ["accept", "c1"],
  ])
    expect((await phase(root, args[0] as string, ...args.slice(1))).code).toBe(
      0,
    );
  return root;
};

/** Every file under `root` except `.git`, with its text, for a before-and-after compare. */
const snapshot = async (root: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (dir: string): Promise<void> => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.name === ".git") continue;
      if (entry.isDirectory()) await walk(full);
      else out[path.relative(root, full)] = await Bun.file(full).text();
    }
  };
  await walk(root);
  return out;
};

test("archive keeps the second paragraph, the nested list, and the fenced line once", async () => {
  const root = await acceptedRich();
  expect((await phase(root, "archive", "c1")).code).toBe(0);
  const text = await file(root, SPEC);
  expect(text).toContain("The second paragraph stays.");
  expect(text).toContain("  - nested item");
  expect(text.split("# a comment")).toHaveLength(2);
});

test("archive refuses an id that is not a change id, and changes no file", async () => {
  const root = await acceptedRich();
  const before = await snapshot(root);
  const r = await phase(root, "archive", ".");
  expect(r.code).toBe(2);
  expect(r.err.join("\n")).toContain("`.` is not a change id");
  expect(await snapshot(root)).toEqual(before);
});

test("archive changes no file when the archive folder is not a folder", async () => {
  const root = await acceptedRich();
  await write(root, ".dotclaude/spec/changes/archive", "not a folder\n");
  const before = await snapshot(root);
  const r = await phase(root, "archive", "c1");
  expect(r.code).toBe(1);
  expect(await snapshot(root)).toEqual(before);
});
