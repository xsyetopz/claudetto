// The public entry of the time code.
// An own export wins over the same name from `export *`.
export * from "./clock.mjs";
export * from "./parse.mjs";
export { parseDuration } from "./strict.mjs";
