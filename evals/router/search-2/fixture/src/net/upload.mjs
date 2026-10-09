import runWithBackoff from "./backoff/engine.mjs";

export const upload = (task) => runWithBackoff(task, 5);
