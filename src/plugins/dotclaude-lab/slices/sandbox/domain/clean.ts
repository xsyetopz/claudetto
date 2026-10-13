// The guard of `dotclaude-sandbox --clean`, which removes a folder with all its contents.
// The sandbox writes only `config/`, `project/`, and `home/` into its folder.
// `setUp` writes `.claude.json` inside `config/`, and the debug log goes to the temp folder.

/** The only entries that the sandbox writes into its folder. */
export const SANDBOX_LAYOUT: readonly string[] = ["config", "project", "home"];

/**
 * Returns why `--clean` must not remove the folder, or `null` when it may.
 * `entries` lists the names in the folder, and `isDefault` is true for the default sandbox folder.
 */
export const cleanRefusal = (
  root: string,
  entries: readonly string[],
  isDefault: boolean,
): string | null => {
  if (isDefault) return null;
  const foreign = entries.filter((e) => !SANDBOX_LAYOUT.includes(e));
  if (foreign.length === 0) return null;
  return `Refusing to remove ${root}: it holds ${foreign.join(", ")}, which is not the sandbox layout. Use the default sandbox folder, or remove this folder by hand.`;
};
