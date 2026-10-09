import { retryWithBackoff } from "./retry.mjs";

export const all = (tasks) => tasks.map((task) => retryWithBackoff(task));
