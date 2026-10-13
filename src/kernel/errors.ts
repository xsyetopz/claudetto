// The error policy of the plugin: a `catch` names the errors that it expects and passes the others on.
// This file has no import, so every layer can use it.

/** The `code` values of a file that is absent or not a readable file, such as a missing transcript. */
export const UNREADABLE = ["ENOENT", "ENOTDIR", "EISDIR", "EACCES"];

/** True when `err` has a `code` or a `name` in `kinds`, such as `ENOENT` or `SyntaxError`. */
export const isExpected = (err: unknown, ...kinds: string[]): boolean => {
  const e = err as { code?: unknown; name?: unknown } | null | undefined;
  return kinds.some((kind) => e?.code === kind || e?.name === kind);
};

/** Returns when `err` is one of `kinds`, and throws `err` again in all other cases. */
export const rethrowUnless = (err: unknown, ...kinds: string[]): void => {
  if (!isExpected(err, ...kinds)) throw err;
};
