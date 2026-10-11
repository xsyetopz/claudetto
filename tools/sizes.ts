// Size checks for the text that goes into each request. The bounds are in `tools/limits.ts`.
// The functions are pure: they take texts and return `{ failures, advisories }`.
// A size above a high bound is a failure. A size below a low bound is an advisory.

import {
  CLAUDE_MD_MAX_BYTES,
  FIRST_REQUEST_HIGH_BYTES,
  FIRST_REQUEST_LOW_BYTES,
  SKILL_BODY_HIGH_BYTES,
  SKILL_BODY_LOW_BYTES,
  SKILL_META_HIGH_BYTES,
  SKILL_META_LOW_BYTES,
  SKILL_META_TOTAL_HIGH_BYTES,
  SKILL_META_TOTAL_LOW_BYTES,
  SKILL_META_TOTAL_MAX_BYTES,
} from "./limits.ts";

/** The messages of a check: the failures, and the advisories that do not fail. */
export type Report = { failures: string[]; advisories: string[] };

/** A text with its path, such as a `SKILL.md` file. */
type Entry = { path: string; text: string };

const bytes = (text: string): number => Buffer.byteLength(text);

/** The frontmatter `name` and `description` and the body of a `SKILL.md` text. */
export function parseSkill(text: string) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  const block = match?.[1] ?? "";
  const field = (key: string) =>
    new RegExp(`^${key}:[ \\t]*(.*)$`, "m")
      .exec(block)?.[1]
      ?.replace(/^"(.*)"$/, "$1") ?? "";
  return {
    name: field("name"),
    description: field("description"),
    body: match ? (match[2] as string) : text,
  };
}

/** The bytes of the frontmatter `name` and `description` of a `SKILL.md` text. */
export function skillMetaBytes(text: string): number {
  const { name, description } = parseSkill(text);
  return bytes(name) + bytes(description);
}

/** Adds a failure above `high` and an advisory below `low`. */
function range(
  out: Report,
  label: string,
  size: number,
  low: number,
  high: number,
) {
  if (size > high)
    out.failures.push(
      `${label} is ${size} bytes, ${size - high} above ${high}`,
    );
  else if (size < low)
    out.advisories.push(
      `${label} is ${size} bytes, ${low - size} below ${low}`,
    );
}

/**
 * The failures and advisories for the files of the repository.
 * `claudeMd` and `skills` are lists of `{ path, text }`.
 */
export function checkSizes({
  claudeMd = [],
  skills = [],
}: {
  claudeMd?: Entry[];
  skills?: Entry[];
}): Report {
  const out: Report = { failures: [], advisories: [] };
  for (const { path, text } of claudeMd)
    range(out, path, bytes(text), 0, CLAUDE_MD_MAX_BYTES);
  let total = 0;
  for (const { path, text } of skills) {
    const meta = skillMetaBytes(text);
    total += meta;
    range(
      out,
      `${path} metadata`,
      meta,
      SKILL_META_LOW_BYTES,
      SKILL_META_HIGH_BYTES,
    );
    range(
      out,
      `${path} body`,
      bytes(parseSkill(text).body),
      SKILL_BODY_LOW_BYTES,
      SKILL_BODY_HIGH_BYTES,
    );
  }
  if (skills.length) {
    const label = "skill metadata of all skills";
    if (total > SKILL_META_TOTAL_MAX_BYTES)
      out.failures.push(
        `${label} is ${total} bytes, ${total - SKILL_META_TOTAL_MAX_BYTES} above the ceiling ${SKILL_META_TOTAL_MAX_BYTES}`,
      );
    else if (total > SKILL_META_TOTAL_HIGH_BYTES)
      out.advisories.push(
        `${label} is ${total} bytes, ${total - SKILL_META_TOTAL_HIGH_BYTES} above the target ${SKILL_META_TOTAL_HIGH_BYTES}`,
      );
    else if (total < SKILL_META_TOTAL_LOW_BYTES)
      out.advisories.push(
        `${label} is ${total} bytes, ${SKILL_META_TOTAL_LOW_BYTES - total} below ${SKILL_META_TOTAL_LOW_BYTES}`,
      );
  }
  return out;
}

/** The failures and advisories for the bytes of the first request, with no tool schemas. */
export function checkFirstRequestBytes(size: number): Report {
  const out: Report = { failures: [], advisories: [] };
  range(
    out,
    "first request text",
    size,
    FIRST_REQUEST_LOW_BYTES,
    FIRST_REQUEST_HIGH_BYTES,
  );
  return out;
}
