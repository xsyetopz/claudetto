// The word splitter of the shell reader, for `shell.ts`, `wrappers.ts`, and the guards.
// The function is pure and imports nothing.

/** The words of one shell segment, with quotes and backslashes removed, also inside a word (`r''m`, `\rm`). */
export const words = (text: unknown): string[] =>
  [...String(text).matchAll(/(?:'[^']*'|"[^"]*"|\\.|[^\s'"\\])+/g)].map((m) =>
    m[0].replace(/'([^']*)'|"([^"]*)"|\\(.)/g, (_, a, b, c) => a ?? b ?? c),
  );
