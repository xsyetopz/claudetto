// `renderSpec`: the text that it writes parses back to the same spec and keeps the prose that the parser drops.

import { expect, test } from "bun:test";
import { renderSpec } from "../../../../src/plugins/dotclaude/slices/spec/adapters/render.ts";
import type { CapabilitySpec } from "../../../../src/plugins/dotclaude/slices/spec/domain/formats.ts";
import { parseSpec } from "../../../../src/plugins/dotclaude/slices/spec/domain/parse.ts";

const parsed = (text: string): CapabilitySpec => {
  const r = parseSpec(text);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.value;
};

const WITH_PROSE = `# Store

Intro prose of the capability.

## Requirements

### Requirement: Alpha
The store SHALL keep alpha.

#### Scenario: Keep
- **WHEN** alpha is set
- **THEN** alpha is kept
- **THEN** alpha is read

## Notes

Prose between the requirements.

### Requirement: Beta
The store SHALL keep beta.
It keeps it for a long time.

#### Scenario: Keep beta
- **WHEN** beta is set
- **THEN** beta is kept
`;

test("a render of a parsed spec parses back to the same spec", () => {
  const spec = parsed(WITH_PROSE);
  const again = parsed(renderSpec("store", WITH_PROSE, spec));
  expect(again).toStrictEqual(spec);
});

test("a render keeps the prose before the requirements and between them", () => {
  const out = renderSpec("store", WITH_PROSE, parsed(WITH_PROSE));
  expect(out).toContain("Intro prose of the capability.");
  expect(out).toContain("## Notes\n\nProse between the requirements.");
  expect(out.indexOf("## Notes")).toBeGreaterThan(out.indexOf("Alpha"));
  expect(out.indexOf("## Notes")).toBeLessThan(out.indexOf("Beta"));
});

test("a second render is the same text as the first", () => {
  const first = renderSpec("store", WITH_PROSE, parsed(WITH_PROSE));
  expect(renderSpec("store", first, parsed(first))).toBe(first);
});

test("a render of a new capability has the title and the requirements heading", () => {
  const out = renderSpec("store", null, {
    requirements: [
      {
        name: "Alpha",
        text: "The store SHALL keep alpha.",
        scenarios: [{ name: "Keep", whenLines: ["a"], thenLines: ["b"] }],
      },
    ],
  });
  expect(out.startsWith("# store\n\n## Requirements\n\n")).toBe(true);
  expect(parsed(out).requirements.map((r) => r.name)).toStrictEqual(["Alpha"]);
});
