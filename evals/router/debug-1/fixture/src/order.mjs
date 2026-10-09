import { toCents } from "./money.mjs";

export function lineTotal(line) {
  const base = toCents(line.price) * line.qty;
  return line.discount ? base - Math.round(base * line.discount) : base;
}

export function orderTotal(order) {
  return order.lines.reduce((sum, line) => sum + lineTotal(line), 0);
}
