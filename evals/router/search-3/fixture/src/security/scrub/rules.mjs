// The rules of `redactSecrets` in ./pipeline.mjs.
export const maskKeys = (s) => s.replace(/key=\w+/g, "key=***");
export const maskTokens = (s) => s.replace(/tok_\w+/g, "tok_***");
