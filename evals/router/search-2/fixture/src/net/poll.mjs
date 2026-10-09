import { withBackoff } from "./backoff/loop.mjs";

export const poll = (task) => withBackoff(task);
