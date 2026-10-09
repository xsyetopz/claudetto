import { retryWithBackoff } from "./retry.mjs";

export const later = (job) => retryWithBackoff(job);
