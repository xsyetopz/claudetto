// The checks of `minispec validate`: the delta specs of a change.
// The levels, the paths, and the messages follow OpenSpec 1.14.3.

import {
  type Block,
  parseDelta,
  requirementText,
  scenarios,
} from "./markdown.ts";

/** One finding. `path` is the delta spec from `specs/`, or `file`. */
export interface Issue {
  readonly level: "ERROR" | "WARNING" | "INFO";
  readonly path: string;
  readonly message: string;
}

const SHALL = /\b(SHALL|MUST)\b/;

const NO_DELTAS =
  'Change must have at least one delta. No deltas found. Ensure your change has a specs/ directory with capability folders (e.g. specs/http-server/spec.md) containing .md files that use delta headers (## ADDED/MODIFIED/REMOVED/RENAMED Requirements) and that each requirement includes at least one "#### Scenario:" block. If this change intentionally modifies no specs (pure refactor, tooling, docs), set "skip_specs: true" in the change\'s .openspec.yaml instead.';

const checkBlocks = (
  kind: string,
  blocks: readonly Block[],
  path: string,
): Issue[] =>
  blocks.flatMap((b) => {
    const text = requirementText(b.raw);
    const label = `${kind} "${b.name}"`;
    const messages: [Issue["level"], string][] = [];
    if (!text) messages.push(["ERROR", `${label} is missing requirement text`]);
    else if (!SHALL.test(text))
      messages.push([
        "WARNING",
        `${label} should contain SHALL or MUST (RFC 2119 best practice for English specs)`,
      ]);
    if (!scenarios(b.raw))
      messages.push(["ERROR", `${label} must include at least one scenario`]);
    return messages.map(([level, message]) => ({ level, path, message }));
  });

/**
 * The findings for the delta `specs` of a change.
 * `skipSpecs` is the `skip_specs` key of `.openspec.yaml`, and `specsHasFiles` tells whether `specs/` holds a file.
 */
export const validateChange = (
  specs: readonly { path: string; text: string }[],
  skipSpecs: boolean,
  specsHasFiles: boolean,
): Issue[] => {
  const found = specs.map(({ path, text }) => ({ path, d: parseDelta(text) }));
  const size = ({ d }: (typeof found)[number]): number =>
    d.added.length + d.modified.length + d.removed.length + d.renamed.length;
  const issues: Issue[] = found.flatMap(({ path, d }) => [
    ...checkBlocks("ADDED", d.added, path),
    ...checkBlocks("MODIFIED", d.modified, path),
  ]);
  for (const f of found.filter((x) => size(x) === 0))
    issues.push({
      level: "ERROR",
      path: f.path,
      message: f.d.sections.length
        ? `Delta sections ${f.d.sections.join(", ")} hold no "### Requirement:" block.`
        : 'No delta sections found. Add a header such as "## ADDED Requirements".',
    });
  const file = (level: Issue["level"], message: string): number =>
    issues.push({ level, path: "file", message });
  const empty = found.every((f) => size(f) === 0);
  if (skipSpecs && specsHasFiles)
    file(
      "ERROR",
      "skip_specs is set in .openspec.yaml but spec files exist under specs/. Remove skip_specs or delete the delta spec files",
    );
  else if (empty && skipSpecs)
    file(
      "INFO",
      "skip_specs is set in .openspec.yaml: change declares no spec-level behavior changes, zero deltas accepted",
    );
  else if (empty) file("ERROR", NO_DELTAS);
  return issues;
};
