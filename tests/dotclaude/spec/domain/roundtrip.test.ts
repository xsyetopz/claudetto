// Round trip of a delta: parse the requirements, then write them back, and get the same text.
// The delta has each feature that the parser used to drop: a second paragraph, a nested list,
// a fenced block with a `#` line, and an `AND` line in a scenario.

import { expect, test } from "bun:test";
import { requirementText } from "../../../../plugins/dotclaude/slices/spec/adapters/render.ts";
import { parseDelta } from "../../../../plugins/dotclaude/slices/spec/domain/parse.ts";

const RICH = `### Requirement: Rich text

The store SHALL keep rich text.

The second paragraph stays.

- a nested list:
  - nested item

#### Scenario: Fenced block

- **WHEN** a fenced block is read
  \`\`\`text
# a comment
## a heading in a fence
  \`\`\`
- **AND** the block keeps its text
- **THEN** the block is kept
`;

const PLAIN = `### Requirement: Plain

The store SHALL keep plain text.

#### Scenario: Plain

- **WHEN** plain text is read
- **THEN** plain text is kept`;

test("a delta with a second paragraph, a nested list, a fence, and AND lines writes back the same text", () => {
  const added = `${RICH}\n${PLAIN}`;
  const delta = parseDelta(`# Store\n\n## ADDED\n\n${added}\n`);
  expect(delta.ok).toBe(true);
  if (!delta.ok) return;
  expect(delta.value.added.map(requirementText).join("\n\n")).toBe(
    added.trimEnd(),
  );
});

test("a fenced `#` line keeps the requirement that holds it", () => {
  const delta = parseDelta(`## ADDED\n\n${RICH}`);
  expect(delta.ok).toBe(true);
  if (!delta.ok) return;
  expect(delta.value.added.map((r) => r.name)).toStrictEqual(["Rich text"]);
  expect(delta.value.added[0]?.scenarios[0]?.whenLines).toStrictEqual([
    "a fenced block is read",
  ]);
});

test("a delta keeps the scenario lines of an AND clause after its WHEN", () => {
  const delta = parseDelta(`## ADDED\n\n${RICH}`);
  if (!delta.ok) throw new Error("the delta should parse");
  expect(delta.value.added[0]?.scenarios[0]?.lines).toContain(
    "- **AND** the block keeps its text",
  );
});
