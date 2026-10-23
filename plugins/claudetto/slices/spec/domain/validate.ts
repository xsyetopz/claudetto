// The checks of `minispec validate`, with the levels, the paths, and the messages of OpenSpec 1.14.3.

import {
  type Block,
  type Delta,
  parseDelta,
  parseMain,
  requirementText,
  scenarioList,
  scenarioLoss,
} from "./markdown.ts";
import { mergeSpec } from "./merge.ts";

type Level = "ERROR" | "WARNING" | "INFO";
/** A rule: when it holds, the finding of its level, path, and message (and line) exists. */
type Row = [boolean, Level, string, string, number?];

const SHALL = /\b(SHALL|MUST)\b/;
const NEEDS =
  "should contain SHALL or MUST (RFC 2119 best practice for English specs)";
const MAX_TEXT = 500;
const MIN_PURPOSE = 50;
const LONG = `Requirement text is very long (>${MAX_TEXT} characters). Move examples and edge cases into scenarios, or split it into separate requirements that each state one behavior.`;
const NO_DELTAS =
  'Change must have at least one delta. No deltas found. Ensure your change has a specs/ directory with capability folders (e.g. specs/http-server/spec.md) containing .md files that use delta headers (## ADDED/MODIFIED/REMOVED/RENAMED Requirements) and that each requirement includes at least one "#### Scenario:" block. If this change intentionally modifies no specs (pure refactor, tooling, docs), set "skip_specs: true" in the change\'s .openspec.yaml instead.';
const GUIDE =
  "Scenarios must use level-4 headers. Convert bullet lists into:\n#### Scenario: Short name\n- **WHEN** ...\n- **THEN** ...\n- **AND** ...";

const found = (rows: Row[]) =>
  rows
    .filter(([on]) => on)
    .map(([, level, path, message, line]) => ({
      level,
      path,
      message,
      ...(line && { line }),
    }));

const bare = (b: Block) => !scenarioList(b.raw).some((s) => s.rawText);

const blockRows = (kind: string, blocks: Block[], path: string) =>
  blocks.flatMap((b, i): Row[] => {
    const text = requirementText(b.raw);
    const label = `${kind} "${b.name}"`;
    return [
      [
        blocks.findIndex((x) => x.name === b.name) < i,
        "ERROR",
        path,
        `Duplicate requirement in ${kind}: "${b.name}"`,
      ],
      [!text, "ERROR", path, `${label} is missing requirement text`],
      [!!text && !SHALL.test(text), "WARNING", path, `${label} ${NEEDS}`],
      [
        kind === "ADDED" && text.length > MAX_TEXT,
        "WARNING",
        path,
        `${label}: ${LONG}`,
      ],
      [bare(b), "ERROR", path, `${label} must include at least one scenario`],
    ];
  });

/** Each modified requirement that drops a scenario of the main spec. */
const lossRows = (d: Delta, main: string | null, path: string) =>
  d.modified.map((b): Row => {
    const old =
      main === null
        ? undefined
        : parseMain(main).blocks.find((c) => c.name === b.name);
    const { missing, balance } = scenarioLoss(old?.raw ?? "", b.raw);
    return [
      !!old && missing.length > 0,
      "ERROR",
      path,
      `MODIFIED "${b.name}" omits scenario(s) the current spec still has: ${missing.map((n) => `"${n}"`).join(", ")}. ${balance} Copy the omitted scenarios into the MODIFIED block (a MODIFIED requirement replaces the whole block, so archive refuses to drop them).`,
    ];
  });

/** The findings for the delta specs of a change. `main` is the text of the main spec of a delta, or `null`. */
export const validateChange = (
  specs: { path: string; text: string; main: string | null }[],
  skipSpecs: boolean,
  hasFiles: boolean,
) => {
  const all = specs.map((s) => ({ ...s, d: parseDelta(s.text) }));
  const size = (d: Delta) =>
    d.added.length + d.modified.length + d.removed.length + d.renamed.length;
  const first = found([
    ...all.flatMap(({ path, d, main }): Row[] => [
      ...d.strays.map(
        ({ header, section, line }): Row => [
          true,
          "INFO",
          path,
          /^requirement:?$/i.test(header)
            ? `Header "### ${header}" in ${section} is missing a requirement name and is ignored by validation. Add a name, e.g. "### Requirement: <name>".`
            : `Header "### ${header}" in ${section} is not a "### Requirement:" header and is ignored by validation. Use "### Requirement: ${header}" if it should be validated as a requirement.`,
          line,
        ],
      ),
      ...blockRows("ADDED", d.added, path),
      ...blockRows("MODIFIED", d.modified, path),
      ...lossRows(d, main, path),
    ]),
    ...all.map(
      ({ path, d }): Row => [
        size(d) === 0,
        "ERROR",
        path,
        d.sections.length
          ? `Delta sections ${d.sections.join(", ")} hold no "### Requirement:" block.`
          : 'No delta sections found. Add a header such as "## ADDED Requirements".',
      ],
    ),
  ]);
  const failed = new Set(
    first.filter((i) => i.level === "ERROR").map((i) => i.path),
  );
  const refused = all
    .filter((f) => !failed.has(f.path))
    .map((f): Row => {
      const m = mergeSpec(
        f.path.slice(0, f.path.lastIndexOf("/")),
        f.main,
        f.text,
        "",
      );
      const e = "error" in m ? m.error : "";
      return [!!e, "INFO", f.path, `Archive would refuse this delta: ${e}`];
    });
  const empty = all.every((f) => size(f.d) === 0);
  return [
    ...first,
    ...found([
      ...refused,
      [
        skipSpecs && hasFiles,
        "ERROR",
        "file",
        "skip_specs is set in .openspec.yaml but spec files exist under specs/. Remove skip_specs or delete the delta spec files",
      ],
      [
        skipSpecs && !hasFiles && empty,
        "INFO",
        "file",
        "skip_specs is set in .openspec.yaml: change declares no spec-level behavior changes, zero deltas accepted",
      ],
      [!skipSpecs && empty, "ERROR", "file", NO_DELTAS],
    ]),
  ];
};

/** The findings for a main spec (`minispec validate --specs`). */
export const validateSpec = (text: string) => {
  const blocks = parseMain(text).blocks;
  const purpose = parseDelta(text).purpose;
  return found([
    ...blocks.map(
      (b, i): Row => [
        bare(b),
        "ERROR",
        `requirements.${i}.scenarios`,
        "Requirement must have at least one scenario",
      ],
    ),
    [
      purpose !== null && purpose.length < MIN_PURPOSE,
      "WARNING",
      "overview",
      `Purpose section is too brief (less than ${MIN_PURPOSE} characters)`,
    ],
    ...blocks.flatMap((b, i): Row[] => [
      [
        bare(b),
        "WARNING",
        `requirements[${i}].scenarios`,
        `Requirement must have at least one scenario. ${GUIDE}`,
      ],
      [
        !SHALL.test(requirementText(b.raw)),
        "WARNING",
        `requirements[${i}]`,
        `Requirement "${b.name}" ${NEEDS}`,
      ],
    ]),
  ]);
};
