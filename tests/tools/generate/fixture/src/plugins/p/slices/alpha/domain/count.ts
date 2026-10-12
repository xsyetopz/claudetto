// Fixture domain code that imports a kernel module.

import { words } from "../../../../../kernel/words.ts";

/** The number of words of `s`. */
export const count = (s: string): number => words(s).length;
