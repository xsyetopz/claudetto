// The verdict of the AI policy check: its record, the hash of the policy files, and the checks of the `ai_policy` input.
// The tool checks the `quote` against the files with an exact substring test after the white space is normalized.
// Nothing here reads a policy text for meaning.

import { STORE_DIR } from "../../../../../kernel/push-hook/index.ts";
import { QUOTE_MIN_CHARS } from "../limits.ts";

/** The verdicts. `silent` means that no file says anything about AI tools. */
export const VERDICTS = [
  "allowed",
  "silent",
  "conditions",
  "forbidden",
] as const;
export type Verdict = (typeof VERDICTS)[number];

/** The stored verdict of one repository. `hash` is of the policy files that Claude read. */
export type Stored = {
  repo: string;
  hash: string;
  verdict: Verdict;
  quote: string;
  conditions: string;
  time: number;
};

/** The text with each run of white space as one space. */
export const normalize = (text: string): string =>
  text.replace(/\s+/g, " ").trim();

/** A 53-bit hash of `text` (cyrb53). It detects a change of the files and is not a defence against an attacker. */
const cyrb53 = (text: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};

/** The hash of a set of files, each as a name and a text. The order of the files does not matter. */
export const hashOf = (
  files: readonly { name: string; text: string }[],
): string =>
  cyrb53(
    files
      .map((f) => `${f.name}\u0000${f.text}`)
      .sort()
      .join("\u0001"),
  );

/** True when `quote` is long enough and is in the text of one of `texts`. */
export const quoteIn = (quote: string, texts: readonly string[]): boolean => {
  const want = normalize(quote);
  return (
    want.length >= QUOTE_MIN_CHARS &&
    texts.some((t) => normalize(t).includes(want))
  );
};

/** The input of the `ai_policy` tool, after the type checks. */
export type PolicyInput = {
  repo: string;
  verdict: Verdict;
  quote: string;
  conditions: string;
  read: string[];
};

/** The input as `PolicyInput`, or the name of the first field that is wrong. */
export const parseInput = (
  e: Readonly<Record<string, unknown>>,
): { ok: true; input: PolicyInput } | { ok: false; field: string } => {
  const { repo, verdict, quote, conditions, read } = e;
  if (typeof repo !== "string" || repo === "")
    return { ok: false, field: "repo" };
  if (!VERDICTS.some((v) => v === verdict))
    return { ok: false, field: "verdict" };
  if (quote !== undefined && typeof quote !== "string")
    return { ok: false, field: "quote" };
  if (conditions !== undefined && typeof conditions !== "string")
    return { ok: false, field: "conditions" };
  if (!Array.isArray(read) || read.some((r) => typeof r !== "string"))
    return { ok: false, field: "read" };
  return {
    ok: true,
    input: {
      repo,
      verdict: verdict as Verdict,
      quote: quote ?? "",
      conditions: conditions ?? "",
      read: read as string[],
    },
  };
};

/** The record from the stored text, or `undefined` when the text is not a valid record. */
export const parseRecord = (text: string): Stored | undefined => {
  try {
    const v = JSON.parse(text) as Partial<Stored>;
    if (
      typeof v.repo === "string" &&
      typeof v.hash === "string" &&
      typeof v.quote === "string" &&
      typeof v.conditions === "string" &&
      typeof v.time === "number" &&
      VERDICTS.some((x) => x === v.verdict)
    )
      return v as Stored;
  } catch {
    // A text that is not JSON is not a record.
  }
  return undefined;
};

/** The folder of the verdict store under the home folder. */
export const storeDirOf = (home: string): string => `${home}/${STORE_DIR}`;

/** The name of the verdict file of a repository key. */
export const fileOf = (home: string, key: string): string =>
  `${storeDirOf(home)}/${key.replace(/[^a-z0-9.-]+/g, "_")}.json`;
