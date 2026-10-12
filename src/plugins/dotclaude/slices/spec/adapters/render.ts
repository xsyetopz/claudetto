// The text of a capability spec, written back after a delta.
// The domain parses a spec but does not write one, so this adapter does.

import type { CapabilitySpec, Requirement } from "../domain/formats.ts";

const REQUIREMENT_HEAD = /^### Requirement: (\S.*)$/;
const SECTION_HEAD = /^#{1,2}\s/;

const requirementText = (req: Requirement): string => {
  const lines = [`### Requirement: ${req.name}`, "", req.text];
  for (const scenario of req.scenarios) {
    lines.push("", `#### Scenario: ${scenario.name}`, "");
    for (const when of scenario.whenLines) lines.push(`- **WHEN** ${when}`);
    for (const then of scenario.thenLines) lines.push(`- **THEN** ${then}`);
  }
  return lines.join("\n");
};

/**
 * The text of `previous` that the parser drops.
 * It is the text before the first requirement, and the text from a `#` or `##` heading
 * to the next requirement, which stays with the requirement before it.
 * A requirement that a delta removes takes its trailer with it.
 */
const splitPrevious = (
  previous: string,
): { preamble: string; trailers: Map<string, string> } => {
  const preamble: string[] = [];
  const trailers = new Map<string, string[]>();
  let name: string | null = null;
  let trailer: string[] | null = null;
  for (const line of previous.split(/\r?\n/)) {
    const head = REQUIREMENT_HEAD.exec(line);
    if (head !== null) {
      name = (head[1] ?? "").trim();
      trailer = null;
    } else if (name !== null && trailer === null && SECTION_HEAD.test(line)) {
      trailer = [];
      trailers.set(name, trailer);
    }
    if (name === null) preamble.push(line);
    else trailer?.push(line);
  }
  return {
    preamble: preamble.join("\n").trimEnd(),
    trailers: new Map(
      [...trailers].map(([n, lines]) => [n, lines.join("\n").trimEnd()]),
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
