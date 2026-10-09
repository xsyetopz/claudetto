// The entry for bundles that run in a browser. A Node.js process does not load it.
export function parseDuration(text) {
  return Number.parseFloat(text) * 1000;
}
