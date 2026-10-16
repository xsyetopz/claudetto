// The pure parts of the git state at the start of the session (spec `ground-gates`, "The session starts with the git state").
// The adapter reads `git` and the manifests, and these functions turn the text into the facts and the context.
// Claude reads the facts from `git` and the files of the project, and never a version from memory (decision D56).

import { MANIFESTS } from "../limits.ts";
import { GIT_STATE, NO_VERSION, TAG_EXISTS, TAG_MISSING } from "../prompts.ts";

/** The version of a manifest, and the name that its plugin or package has. */
export interface Manifest {
  file: string;
  version: string;
  name: string | null;
}

/** The facts that the context and the ask of the changelog read. */
export interface RepoState {
  describe: string;
  branch: string;
  /** The first manifest with a version, or `null` when the project has none. */
  manifest: Manifest | null;
  /** The manifests that the adapter read, for the context. */
  files: string[];
  /** The tag of the version that exists, or `null` when none exists. */
  tag: string | null;
  /** The tag names that the check tried. */
  checked: string[];
}

/** The manifest in `text`, or `null` when `text` is no JSON object with a text `version`. */
export const manifestOf = (file: string, text: string): Manifest | null => {
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const { version, name } = value as { version?: unknown; name?: unknown };
    if (typeof version !== "string" || version === "") return null;
    return { file, version, name: typeof name === "string" ? name : null };
  } catch {
    return null;
  }
};

/** The tag names that mean the release of `version`: `1.2.3`, `v1.2.3`, and `<name>--v1.2.3`, which `claude plugin tag` writes. */
export const tagNames = (
  version: string,
  names: readonly string[],
): string[] => [
  ...new Set([
    version,
    `v${version}`,
    ...names.map((name) => `${name}--v${version}`),
  ]),
];

/** The first of `candidates` that is a line of `listed`, the output of `git tag --list`, or `null`. */
export const existingTag = (
  candidates: readonly string[],
  listed: string,
): string | null => {
  const tags = new Set(listed.split("\n").map((line) => line.trim()));
  return candidates.find((tag) => tags.has(tag)) ?? null;
};

/** The context for Claude: the output of `git describe`, the branch, the version, and whether its tag exists. */
export const stateContext = (state: RepoState): string => {
  const { manifest } = state;
  const tag = manifest
    ? state.tag === null
      ? TAG_MISSING({
          checked: state.checked.map((t) => `\`${t}\``).join(", "),
        })
      : TAG_EXISTS({ tag: state.tag })
    : NO_VERSION({
        files: MANIFESTS.map((file) => `\`${file}\``).join(", "),
      });
  return GIT_STATE({
    describe: state.describe ? `\`${state.describe}\`` : "none",
    branch: state.branch || "(detached)",
    manifest: manifest ? `\`${manifest.file}\`` : "the manifests",
    version: manifest?.version ?? "none",
    tag,
  });
};
