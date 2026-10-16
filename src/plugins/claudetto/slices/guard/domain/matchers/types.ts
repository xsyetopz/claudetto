// The shape of a literal matcher, which each category file of `matchers/` exports as entries.
// A matcher reads the words of one simple command, after the wrapper commands are removed, and never parses the text itself.
// The `kind` port tells a whole folder from a file, so a matcher can ask about a path.
// The `isMainCheckout` port tells the main checkout from a linked worktree, for the rule of a branch switch.

/** What a path is: a folder, a file, or nothing at all. */
export type PathKind = "folder" | "file" | "missing";

/** The lookup of a path, relative to the working directory or absolute. */
export type Kind = (path: string) => Promise<PathKind>;

/**
 * The context of a matcher: the lookup of a path, under the folder of `git -C` or `cd` when one is set,
 * and the check whether a folder is the main checkout of a repository.
 * Both ports are lazy: a call reads the file system only when a matcher calls it.
 */
export type Ctx = {
  kind: Kind;
  isMainCheckout: (dir?: string) => Promise<boolean>;
};

/**
 * A literal form that the guard denies.
 * `id` is the catalog id, `examples` are commands that the matcher denies (one per form), and `match` reads the words of one command.
 */
export type Matcher = {
  id: string;
  examples: readonly string[];
  match: (words: readonly string[], ctx: Ctx) => Promise<boolean>;
};

/** Where a matcher applies: `floor` in every session, and `subagent` only in a subagent. */
export type Tier = "floor" | "subagent";
