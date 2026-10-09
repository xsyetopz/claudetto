import { parseDuration } from "../time/browser.mjs";

export const pageDelay = (text) => parseDuration(text);
