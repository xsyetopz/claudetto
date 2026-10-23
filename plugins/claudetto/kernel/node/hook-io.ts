// The glue of the classic command hooks. Only a classic hook imports this file, never `hooks/register.ts`.
// A payload that is not JSON prints nothing, and the permission flow of Claude Code decides.
// Any other error prints nothing on stdout and goes to stderr with exit code 0, so a hook never blocks a call.

import { rethrowUnless } from "../errors.ts";

/** The whole text of stdin. */
export const readStdin = (): Promise<string> => Bun.stdin.text();

type HookIO = {
  read?: () => string | Promise<string>;
  write?: (text: string) => unknown;
  fail?: (text: string) => unknown;
};

export const failureText = (err: unknown): string =>
  `claudetto hook failed: ${(err as Error | null | undefined)?.stack ?? err}\n`;

/** Reads the JSON payload, calls `decide`, and prints its output as JSON when it gives one. `read`, `write`, and `fail` replace stdin, stdout, and stderr in a test. */
export const runHook = async (
  decide: (payload: unknown) => unknown | Promise<unknown>,
  {
    read = readStdin,
    write = (text: string) => process.stdout.write(text),
    fail = (text: string) => process.stderr.write(text),
  }: HookIO = {},
): Promise<void> => {
  try {
    const text = await read();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch (err) {
      rethrowUnless(err, "SyntaxError");
      return;
    }
    const out = await decide(payload);
    if (out) write(JSON.stringify(out));
  } catch (err) {
    fail(failureText(err));
  }
};
