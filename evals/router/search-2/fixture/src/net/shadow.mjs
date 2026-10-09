import { retryWithBackoff } from "./retry.mjs";

export const TYPE = typeof retryWithBackoff;
// The parameter hides the import, so this call is not a call of the import.
export const withRetry = (retryWithBackoff, task) => retryWithBackoff(task);
