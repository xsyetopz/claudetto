/** The engine resolves a relative path against the shell's directory, which a `cd` moves, and the project root stays. */
export const atRoot = (root: string, path: string): string => `${root}/${path}`;
