import { retryWithBackoff } from "./retry.mjs";

// The function is stored here for a later call by name. This file never calls it.
export const KEEP = { retryWithBackoff };
