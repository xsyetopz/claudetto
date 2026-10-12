// The text of a capability spec, written back after a delta.
// The domain parses a spec but does not write one, so this adapter does.

import type { CapabilitySpec, Requirement } from "../domain/formats.ts";

const REQUIREMENT_HEAD = /^### Requirement: /m;

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
 * The text of `spec`.
 * It keeps the text of `previous` before its first requirement, such as the title and the `## Requirements` heading.
 * A new capability, with no previous text, gets the title `# <capability>`.
 */
export const renderSpec = (
  capability: string,
  previous: string | null,
  spec: CapabilitySpec,
): string => {
  const head = previous === null ? -1 : previous.search(REQUIREMENT_HEAD);
  const preamble =
    previous === null
      ? `# ${capability}\n\n## Requirements`
      : (head < 0 ? previous : previous.slice(0, head)).trimEnd();
  return `${[preamble, ...spec.requirements.map(requirementText)].join("\n\n")}\n`;
};
