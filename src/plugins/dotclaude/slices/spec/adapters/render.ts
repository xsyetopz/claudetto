// The text of a capability spec, written back after a delta.
// The domain parses a spec but does not write one, so this adapter does.
// A requirement keeps its verbatim text, so the text that a delta does not change stays the same.

import type { CapabilitySpec, Requirement } from "../domain/formats.ts";
import { fenceMask, toLines, trimBlank } from "../domain/lines.ts";

const REQUIREMENT_HEAD = /^### Requirement: (\S.*)$/;
const SECTION_HEAD = /^#{1,2}\s/;

/** The text of one requirement: its heading, its body, and its scenarios, with one blank line between the parts. */
export const requirementText = (req: Requirement): string =>
  [
    `### Requirement: ${req.name}`,
    req.text,
    ...req.scenarios.map((s) =>
      [`#### Scenario: ${s.name}`, s.lines.join("\n")]
        .filter((part) => part !== "")
        .join("\n\n"),
    ),
  ]
    .filter((part) => part !== "")
    .join("\n\n");

/**
 * The text of `previous` that the parser drops.
 * It is the text before the first requirement, and the text from a `#` or `##` heading
 * to the next requirement, which stays with the requirement before it.
 * A line in a fenced code block is text of the requirement, not a heading.
 * A requirement that a delta removes takes its trailer with it.
 */
const splitPrevious = (
  previous: string,
): { preamble: string; trailers: Map<string, string> } => {
  const preamble: string[] = [];
  const trailers = new Map<string, string[]>();
  let name: string | null = null;
  let trailer: string[] | null = null;
  const all = toLines(previous);
  const fenced = fenceMask(all);
  for (const [i, { text: line }] of all.entries()) {
    const inFence = fenced[i] === true;
    const head = inFence ? null : REQUIREMENT_HEAD.exec(line);
    if (head !== null) {
      name = (head[1] ?? "").trim();
      trailer = null;
    } else if (
      !inFence &&
      name !== null &&
      trailer === null &&
      SECTION_HEAD.test(line)
    ) {
      trailer = [];
      trailers.set(name, trailer);
    }
    if (name === null) preamble.push(line);
    else trailer?.push(line);
  }
  return {
    preamble: trimBlank(preamble).join("\n"),
    trailers: new Map(
      [...trailers].map(([n, lines]) => [n, trimBlank(lines).join("\n")]),
    ),
  };
};

/**
 * The text of `spec`.
 * It keeps the text of `previous` that the parser drops: the title and the `## Requirements`
 * heading before the first requirement, and each `#` or `##` section between requirements.
 * A new capability, with no previous text, gets the title `# <capability>`.
 */
export const renderSpec = (
  capability: string,
  previous: string | null,
  spec: CapabilitySpec,
): string => {
  const kept =
    previous === null
      ? {
          preamble: `# ${capability}\n\n## Requirements`,
          trailers: new Map<string, string>(),
        }
      : splitPrevious(previous);
  const blocks = spec.requirements.map((req) => {
    const trailer = kept.trailers.get(req.name);
    return trailer
      ? `${requirementText(req)}\n\n${trailer}`
      : requirementText(req);
  });
  return `${[kept.preamble, ...blocks].join("\n\n")}\n`;
};
