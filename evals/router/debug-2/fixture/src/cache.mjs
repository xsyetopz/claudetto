import { keyOf } from "./key.mjs";

const store = new Map();
export function cached(key, make) {
  const k = keyOf(key);
  if (!store.has(k)) store.set(k, make());
  return store.get(k);
}
