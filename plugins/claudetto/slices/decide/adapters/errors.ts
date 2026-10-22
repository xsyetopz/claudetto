// The errors and the exit codes of the command `claudetto-decide`, which `cli.ts` and `image.ts` share.

export const EXIT = {
  ok: 0,
  failed: 1,
  usage: 2,
  invalidKey: 3,
  noBalance: 4,
} as const;

/** A fault of the arguments or of the key. The command exits with `EXIT.usage`. */
export class UsageError extends Error {}

/** A reply of the API with an error status. The command exits with the code that `exitOf` gives it. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
