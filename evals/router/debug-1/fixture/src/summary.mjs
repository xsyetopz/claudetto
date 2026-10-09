import { fromCents } from "./money.mjs";
import { orderTotal } from "./order.mjs";

/** The total of all orders, as a text with two decimals. */
export function summary(orders) {
  return fromCents(orders.reduce((sum, o) => sum + orderTotal(o), 0));
}
