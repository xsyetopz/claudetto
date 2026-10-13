// The attribution lines of the `attribution` hook: the `Co-Authored-By` line of a commit and the footer of a pull request.
// The rules follow `rro` of Claude Code 2.1.296 (`external/cc-2.1.296/strings.txt`, evidence `attribution.md`):
// a set `attribution` object wins, an empty value turns its part off, and `includeCoAuthoredBy: false` turns both parts off.
// When the hook cannot name the model, the name is `Claude`, as the user decided.

/** The footer of a pull request, as Claude Code writes it by default. */
export const PR_LINE =
  "🤖 Generated with [Claude Code](https://claude.com/claude-code)";

/** The lines of one call: the commit line and the pull request line, or "" for a part that is off. */
export type Lines = { commit: string; pr: string };

/** An id of a model, such as `claude-sonnet-5-5`, with its family and its version. */
const MODEL_ID = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/;

/**
 * The name of a model as Claude Code shows it, such as `Claude Sonnet 5.5`.
 * It is `Claude` when the id is absent or has no family and version, such as an alias.
 */
export const modelName = (model: string | undefined): string => {
  const id = (model ?? "")
    .trim()
    .toLowerCase()
    .replace(/\[1m\]$/, "");
  const found = MODEL_ID.exec(id);
  if (!found) return "Claude";
  const [, family = "", major = "", minor] = found;
  const name = family.charAt(0).toUpperCase() + family.slice(1);
  return `Claude ${name} ${minor === undefined ? major : `${major}.${minor}`}`;
};

/** The fields of the merged settings that the attribution reads. */
export type Settings = { attribution?: unknown; includeCoAuthoredBy?: unknown };

/** The fields of an `attribution` object that the attribution reads. */
type Custom = { commit?: unknown; pr?: unknown };

const isRecord = (value: unknown): value is Custom =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The value of a field of `attribution` when it is a string, or the default otherwise. */
const textOr = (value: unknown, fallback: string) =>
  typeof value === "string" ? value : fallback;

/**
 * The lines of a call, from the merged settings and the model of the call.
 * `model` is undefined for a call of a subagent, so its commit line names `Claude`.
 */
export const linesOf = (
  settings: Settings,
  model: string | undefined,
): Lines => {
  const commit = `Co-Authored-By: ${modelName(model)} <noreply@anthropic.com>`;
  const custom = settings.attribution;
  if (isRecord(custom))
    return {
      commit: textOr(custom.commit, commit),
      pr: textOr(custom.pr, PR_LINE),
    };
  if (settings.includeCoAuthoredBy === false) return { commit: "", pr: "" };
  return { commit, pr: PR_LINE };
};
