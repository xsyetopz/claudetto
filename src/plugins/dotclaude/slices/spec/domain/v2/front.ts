// The front matter of the Markdown files of schema 2: the keys of each `kind`, the check of a file, and the writer of the front matter.
// The keys are the Files table of `design-spec-2.md`. Plain data and pure functions only.

import { FRONT_SCHEMA_2 } from "../../../../../../kernel/state-events.ts";
import type { FormatError, Result } from "../formats.ts";
import { fail, result, toLines } from "../lines.ts";
import { isChangeState, isPackageState } from "./states.ts";

/** The `kind` values of schema 2, from the Files table. */
export const FRONT_KINDS = [
  "change",
  "requirements",
  "design",
  "package",
  "spec",
] as const;

/** One `kind` of a file, from `FRONT_KINDS`. */
export type FrontKind = (typeof FRONT_KINDS)[number];

/** The sizes of a change. A test pins this list to `SIZES` of `limits.ts`, because a domain file cannot import `limits.ts`. */
export const FRONT_SIZES: readonly string[] = ["trivial", "medium", "large"];

/** The front matter keys of each `kind`, in the order that the writer gives them. */
export const FRONT_KEYS: Record<FrontKind, readonly string[]> = {
  change: ["schema", "kind", "id", "size", "status", "verify"],
  requirements: ["schema", "kind", "capability"],
  design: ["schema", "kind", "id"],
  package: [
    "schema",
    "kind",
    "id",
    "title",
    "wave",
    "deps",
    "owns",
    "satisfies",
    "verify",
    "agent",
    "status",
  ],
  spec: ["schema", "kind", "capability"],
};

/** The keys whose value is a list of strings. */
const LIST_KEYS: readonly string[] = ["deps", "owns", "satisfies"];

/** One value of a front matter key: a string, or a list of strings. */
export type FrontValue = string | string[];

/** The front matter of a file: each key with its value. */
export type Front = Record<string, FrontValue>;

const FRONT_LINE = /^([a-z]+):(?:\s+(.*))?$/;

/** The value of one front matter line: a JSON list, a JSON string, or the raw text. Gives null when the JSON is not valid. */
const frontValue = (raw: string): FrontValue | null => {
  if (raw.startsWith("[")) {
    const list: unknown = parseJson(raw);
    return Array.isArray(list) && list.every((s) => typeof s === "string")
      ? (list as string[])
      : null;
  }
  if (raw.startsWith('"')) {
    const text: unknown = parseJson(raw);
    return typeof text === "string" ? text : null;
  }
  return raw;
};

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

/**
 * The front matter of `text` with the line of each key, or the errors of the block.
 * The block starts at the first line with `---` and ends at the next one.
 * Each key is `key: value`, and a key that repeats is an error.
 */
export const parseFront = (
  text: string,
): Result<{ front: Front; lines: Record<string, number> }, FormatError> => {
  const lines = toLines(text);
  const close = lines.findIndex((l, i) => i > 0 && l.text === "---");
  if (lines[0]?.text !== "---" || close < 0)
    return {
      ok: false,
      errors: [fail(1, "no front matter between `---` lines")],
    };
  const errors: FormatError[] = [];
  const front: Front = {};
  const at: Record<string, number> = {};
  for (const line of lines.slice(1, close)) {
    if (line.text.trim() === "") continue;
    const m = FRONT_LINE.exec(line.text);
    const key = m?.[1] ?? "";
    const value = m === null ? null : frontValue((m[2] ?? "").trim());
    if (m === null || value === null) {
      errors.push(
        fail(
          line.line,
          "a front matter line is `key: value`, and its JSON is valid",
        ),
      );
    } else if (key in front) {
      errors.push(fail(line.line, `duplicate front matter key \`${key}\``));
    } else {
      front[key] = value;
      at[key] = line.line;
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { front, lines: at } };
};

/**
 * The check of the front matter of a file of `kind`: each key of the Files table is present, no other key is, and each value has its type.
 * The `schema` is `dotclaude-spec/2`, and the `kind` is `kind`.
 * A package and a change have a `status` from their states, a change has a `size` from `SIZES`, and a `wave` is a whole number.
 */
export const checkFront = (
  text: string,
  kind: FrontKind,
): Result<Front, FormatError> => {
  const parsed = parseFront(text);
  if (!parsed.ok) return parsed;
  const { front, lines } = parsed.value;
  const { schema, kind: kindValue, status, size, wave, id } = front;
  const errors: FormatError[] = [];
  const at = (key: string): number => lines[key] ?? 1;
  const keys = FRONT_KEYS[kind];
  for (const key of keys)
    if (!(key in front))
      errors.push(fail(1, `missing front matter key \`${key}\``));
  for (const key of Object.keys(front))
    if (!keys.includes(key))
      errors.push(
        fail(
          at(key),
          `unknown front matter key \`${key}\` for kind \`${kind}\``,
        ),
      );
  for (const key of keys)
    if (key in front && LIST_KEYS.includes(key) !== Array.isArray(front[key]))
      errors.push(
        fail(
          at(key),
          `\`${key}\` must be ${LIST_KEYS.includes(key) ? "a list" : "a string"}`,
        ),
      );
  if (schema !== FRONT_SCHEMA_2)
    errors.push(fail(at("schema"), `\`schema\` must be \`${FRONT_SCHEMA_2}\``));
  if (kindValue !== kind)
    errors.push(fail(at("kind"), `\`kind\` must be \`${kind}\``));
  if (kind === "package" && !isPackageState(status))
    errors.push(fail(at("status"), "`status` must be a package state"));
  if (kind === "change" && !isChangeState(status))
    errors.push(fail(at("status"), "`status` must be a change state"));
  if (kind === "change" && !FRONT_SIZES.includes(String(size)))
    errors.push(
      fail(at("size"), "`size` must be `trivial`, `medium`, or `large`"),
    );
  if (kind === "package" && !/^\d+$/.test(String(wave)))
    errors.push(fail(at("wave"), "`wave` must be a whole number"));
  if (keys.includes("id") && typeof id !== "string")
    errors.push(fail(at("id"), "`id` must be a string"));
  return result(front, errors);
};

/** The text of one value in the front matter: a list in JSON, and a string that starts with `[` or `"` in JSON too. */
const render = (value: FrontValue): string =>
  Array.isArray(value) || /^["[]/.test(value) ? JSON.stringify(value) : value;

/**
 * The front matter block of a file of `kind`, from `values`, with each key of the Files table in its order.
 * It ends with the `---` line and a blank line, so the body of the file starts after it.
 */
export const renderFront = (kind: FrontKind, values: Front): string => {
  const body = FRONT_KEYS[kind].map((key) => {
    const value = values[key];
    if (value === undefined)
      throw new Error(
        `renderFront: no value for \`${key}\` of kind \`${kind}\``,
      );
    return `${key}: ${render(value)}`;
  });
  return ["---", ...body, "---", ""].join("\n");
};
