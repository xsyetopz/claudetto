// Writes `wiki/rationale/Controls.md` from the `controls` of each slice (design D27): one row for each control.
// No page is written when no slice has a control.

import type { FoundPlugin } from "../discover.ts";
import { type Output, withHeader } from "./texts.ts";

const FILE = "wiki/rationale/Controls.md";
const SOURCE = "src/plugins/*/slices/*/slice.ts";

const INTRO = [
  "# Controls",
  "",
  "This page lists each hook, guard, cap, and notice of claudetto.",
  "Each row names the incident that the control exists for and the condition that removes it.",
  "A row with `none recorded` has no evidence in the repository, so it is a candidate for removal.",
  "",
  "| Slice | Control | Incident | Remove When |",
  "| --- | --- | --- | --- |",
];

/** The page of the controls of `plugins`, or none when no slice has a control. */
export const controlsOf = (plugins: readonly FoundPlugin[]): Output[] => {
  const rows = plugins.flatMap((p) =>
    p.slices.flatMap((s) =>
      (s.slice.controls ?? []).map(
        (c) =>
          `| \`${p.name}/${s.name}\` | \`${c.name}\` | ${c.incident} | ${c.removeWhen} |`,
      ),
    ),
  );
  if (!rows.length) return [];
  const text = `${[...INTRO, ...rows, "", "## Related Pages", "", "- [Decisions](Decisions)"].join("\n")}\n`;
  return [{ file: FILE, source: SOURCE, text: withHeader(FILE, SOURCE, text) }];
};
