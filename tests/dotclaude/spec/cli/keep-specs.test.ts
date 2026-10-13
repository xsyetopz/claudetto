// `archive` keeps the text of a requirement, refuses an id that is not a change id,
// and restores `specs/` when a later step fails.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { makeStore, read, run } from "./helpers.ts";

const CHANGE = ".dotclaude/spec/changes/c1";
const SPECS = ".dotclaude/spec/specs/store.md";

const SPEC = `# Store

## Requirements

### Requirement: Alpha
The store SHALL keep alpha.

#### Scenario: Keep
- **WHEN** alpha is set
- **THEN** alpha is kept
`;

const RICH_DELTA = `# Store

## ADDED

### Requirement: Rich text
The store SHALL keep rich text.

The second paragraph stays.

- a nested list:
  - nested item

#### Scenario: Fenced block

- **WHEN** a fenced block is read
  \`\`\`text
# a comment
  \`\`\`
- **AND** the block keeps its text
- **THEN** the block is kept
`;

/** Every file under `root`, with its text, for a before-and-after compare. */
const snapshot = async (root: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (dir: string): Promise<void> => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out[path.relative(root, full)] = await Bun.file(full).text();
    }
  };
  await walk(root);
  return out;
};

test("archive keeps the second paragraph, the nested list, the fenced line, and the AND line", async () => {
  const root = await makeStore({
    [SPECS]: SPEC,
    [`${CHANGE}/change.md`]: "# c1\n",
    [`${CHANGE}/specs/store.md`]: RICH_DELTA,
  });
  expect((await run(root, "archive", "c1")).code).toBe(0);
  const text = await read(root, SPECS);
  expect(text).toContain("The second paragraph stays.");
  expect(text).toContain("  - nested item");
  expect(text).toContain("# a comment");
  expect(text).toContain("- **AND** the block keeps its text");
  expect(text.split("# a comment")).toHaveLength(2);
});

test("archive refuses an id that is not a change id, and changes no file", async () => {
  const root = await makeStore({
    [SPECS]:
      "## REMOVED\n\n### Requirement: Alpha\nThe store SHALL keep alpha.\n",
    [`${CHANGE}/change.md`]: "# c1\n",
  });
  const before = await snapshot(root);
  const r = await run(root, "archive", ".");
  expect(r.code).toBe(1);
  expect(r.err.join("\n")).toContain("`.` is not a change id");
  expect(await snapshot(root)).toStrictEqual(before);
});

test("archive restores specs when the move of the change fails", async () => {
  const root = await makeStore({
    [SPECS]: SPEC,
    [`${CHANGE}/change.md`]: "# c1\n",
    [`${CHANGE}/specs/store.md`]: RICH_DELTA,
    ".dotclaude/spec/changes/archive": "not a folder\n",
  });
  const before = await snapshot(root);
  const r = await run(root, "archive", "c1");
  expect(r.code).toBe(1);
  expect(await snapshot(root)).toStrictEqual(before);
});
