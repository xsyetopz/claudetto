// The bounds of the kernel commands.

/** The tries of a rename in `writeAtomic`, the first one included, because a Windows file system can fail a rename for a short time. */
export const RENAME_TRIES = 10;

/** The wait in milliseconds between two tries of a rename in `writeAtomic`. */
export const RENAME_WAIT_MS = 100;
