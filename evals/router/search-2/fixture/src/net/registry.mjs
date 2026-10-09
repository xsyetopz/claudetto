import * as retry from "./retry.mjs";

const ACTIONS = { get: "retryWithBackoff" };
export const run = (name, task) => retry[ACTIONS[name]](task);
