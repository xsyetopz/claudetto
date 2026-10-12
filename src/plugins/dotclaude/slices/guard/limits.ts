// The bounds of the `guard` slice (design D22).

/** The size of the largest file that `$.fs.read` reads, which is 4 MiB. A larger file gets no line count. */
export const READ_MAX_BYTES = 4 * 1024 * 1024;
