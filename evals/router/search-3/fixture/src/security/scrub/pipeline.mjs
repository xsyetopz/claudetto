import { maskKeys, maskTokens } from "./rules.mjs";

const compose =
  (...steps) =>
  (x) =>
    steps.reduce((acc, step) => step(acc), x);

export const redactAll = compose(maskKeys, maskTokens);
