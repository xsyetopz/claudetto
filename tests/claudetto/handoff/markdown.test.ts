// The Markdown form of a handoff file passes the Markdown lint of the repository (fault C1).
// The sample is the handoff of run `r1` of `handoff-repeat-300`, which has a line that is only emphasis and a list right after it.

import { expect, test } from "bun:test";
// The package `markdownlint` is a nested dependency of `markdownlint-cli2`, which re-exports it without types.
// @ts-expect-error TS7016: the re-export has no declaration file
import { lint as untypedLint } from "markdownlint-cli2/markdownlint/promise";
import { handoffMarkdown } from "../../../plugins/claudetto/slices/handoff/domain/markdown.ts";

type LintFn = (options: {
  strings: Record<string, string>;
  config: Record<string, unknown>;
}) => Promise<Record<string, { ruleNames: string[] }[]>>;
const lint = untypedLint as LintFn;

const config = async (): Promise<Record<string, unknown>> =>
  Bun.JSONC.parse(await Bun.file(".markdownlint.jsonc").text()) as Record<
    string,
    unknown
  >;

/** The lint errors of `text` with the repository config, as `MD032` names. */
const faults = async (text: string): Promise<string[]> => {
  const result = await lint({ strings: { text }, config: await config() });
  return (result["text"] ?? []).map((e) => e.ruleNames[0] as string);
};

const SAMPLE = [
  "**Handoff**",
  "- **Task:** Read `a.txt` at offset 1 (limit 600), then offset 601 (limit 600), then `cat b.txt`.",
  "- **Done this session:** Step 1. Line 1 is exactly `FIRST-LINE: amber-falcon-42`.  ",
  "* **Next step:** Run step 2, then step 3.",
  "+ **Working directory:** `/w`.\tNo edits made.",
].join("\n");

test("the sample handoff has lint errors before the repair", async () => {
  expect(await faults(SAMPLE)).toEqual(
    expect.arrayContaining(["MD004", "MD009", "MD010", "MD032", "MD036"]),
  );
});

test("`handoffMarkdown` gives a text with no lint error", async () => {
  expect(await faults(handoffMarkdown(SAMPLE))).toEqual([]);
});

test("`handoffMarkdown` repairs a list in a paragraph, indented items, quotes, and blank lines", async () => {
  const text = [
    "Done steps:",
    "- `a`",
    "  - `b`",
    "    more of `b`",
    "Next: step 3.",
    "",
    "",
    "",
    "> one",
    "",
    "> two",
  ].join("\n");
  const out = handoffMarkdown(text);
  expect(await faults(out)).toEqual([]);
  expect(out).toBe(
    "Done steps:\n\n- `a`\n  - `b`\n    more of `b`\n\nNext: step 3.\n\n> one\n>\n> two\n",
  );
});
