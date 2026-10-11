// The error policy of the plugin: a `catch` names the errors that it expects and passes the others on.

/** Returns when `err` has a `code` or a `name` in `kinds`, such as `ENOENT` or `SyntaxError`, and throws `err` again otherwise. */
export function rethrowUnless(err: unknown, ...kinds: string[]): void {
  const e = err as { code?: unknown; name?: unknown } | null | undefined;
  if (!kinds.some((kind) => e?.code === kind || e?.name === kind)) throw err;
}
