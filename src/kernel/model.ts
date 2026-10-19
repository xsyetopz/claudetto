// The parts of a Claude model id. This file has no import, so every layer can use it.

/** The model families of Claude Code 2.1.303. */
const FAMILIES = ["opus", "sonnet", "haiku", "fable", "mythos"] as const;

/** A model family of `FAMILIES`, or `unknown` for a family that this list does not have. */
export type Family = (typeof FAMILIES)[number] | "unknown";

/** The parts of a Claude model id: the family, the major version, and the minor version. */
export type ModelId = {
  family: Family;
  major: number;
  minor: number | null;
};

/**
 * The family, major, and minor version of a Claude model id, or `null` for any other id.
 * `claude-opus-5-5` gives `{ family: "opus", major: 5, minor: 5 }`.
 * An id with no minor version, such as `claude-haiku-5`, gives `minor: null`.
 * A date suffix, such as `-20251001`, is not a minor version.
 * A family that is not in `FAMILIES`, such as the one of `claude-zeta-9`, gives `family: "unknown"`.
 */
export const parseModel = (id: unknown): ModelId | null => {
  const m = /claude-([a-z]+)-(\d+)(?:-(\d{1,2})(?!\d))?/i.exec(
    String(id ?? ""),
  );
  if (!m) return null;
  const name = (m[1] as string).toLowerCase();
  return {
    family: FAMILIES.find((f) => f === name) ?? "unknown",
    major: Number(m[2]),
    minor: m[3] === undefined ? null : Number(m[3]),
  };
};
