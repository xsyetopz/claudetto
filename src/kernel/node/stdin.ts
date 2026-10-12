// The text of stdin, read by Bun. A classic hook reads its JSON payload with this function.

/** The whole text of stdin. */
export const readStdin = (): Promise<string> => Bun.stdin.text();
