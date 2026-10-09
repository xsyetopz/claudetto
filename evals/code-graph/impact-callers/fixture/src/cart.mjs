import { applyDiscount } from "./price.mjs";
export const cartTotal = (items) =>
  applyDiscount(
    items.reduce((s, i) => s + i.p, 0),
    10,
  );
