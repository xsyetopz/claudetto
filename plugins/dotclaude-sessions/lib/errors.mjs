// The error policy of the plugin: a `catch` names the errors that it expects and passes the others on.

/** Returns when `err` has a `code` or a `name` in `kinds`, such as `ENOENT` or `SyntaxError`, and throws `err` again otherwise. */
export function rethrowUnless(err, ...kinds) {
  if (!kinds.some((kind) => err?.code === kind || err?.name === kind))
    throw err;
}
