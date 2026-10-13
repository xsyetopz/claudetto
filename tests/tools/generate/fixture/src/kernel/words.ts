// A fixture kernel module that the slices import, and that imports `text.ts`.

import { trimmed } from "./text.ts";

/** The words of `s`. */
export const words = (s: string): string[] => trimmed(s).split(/\s+/);
