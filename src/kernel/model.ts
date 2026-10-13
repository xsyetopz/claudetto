// The parts of a Claude model id. This file has no import, so every layer can use it.

/** The parts of a Claude model id: the family, the major version, and the minor version. */
export type ModelId = {
  family: string;
  major: number;
  minor: number | null;
};

/**
 * The family, major, and minor version of a Claude model id, or `null` for any other id.
 * `claude-opus-5-5` gives `{ family: "opus", major: 5, minor: 5 }`.
 * An id with no minor version, such as `claude-haiku-5`, gives `minor: null`.
 * A date suffix, such as `-20251001`, is not a minor version.
 */
export const parseModel = (id: unknown): ModelId | null => {
  const m = /claude-([a-z]+)-(\d+)(?:-(\d{1,2})(?!\d))?/i.exec(
    String(id ?? ""),
  );
  if (!m) return null;
  return {
    family: (m[1] as string).toLowerCase(),
    major: Number(m[2]),
    minor: m[3] === undefined ? null : Number(m[3]),
  };
};
