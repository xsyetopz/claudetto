import { canon } from "./canon.mjs";

export function keyOf(value) {
  return `k:${canon(value)}`;
}
