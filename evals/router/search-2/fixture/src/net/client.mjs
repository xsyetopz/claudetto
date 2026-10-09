import { retryWithBackoff } from "./retry.mjs";

export const get = (url) => retryWithBackoff(() => fetch(url));
