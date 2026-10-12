// The TypeScript literal of a filter of a mod handler, for the generated `register.ts`.
// The mod runtime reads each event and filter as a literal, so the generator writes the value, not a reference.
// A filter holds only `MatcherData` of `claude-code`: a string, a number, a boolean, `null`, a `RegExp`, an array, or an object.

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** The TypeScript source of the matcher value `value`. It throws on a value that is not `MatcherData`, with `where` in the message. */
export const literal = (value: unknown, where: string): string => {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value instanceof RegExp) return value.toString();
  if (Array.isArray(value))
    return `[${value.map((v) => literal(v, where)).join(", ")}]`;
  if (
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const fields = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(
        ([k, v]) =>
          `${IDENTIFIER.test(k) ? k : JSON.stringify(k)}: ${literal(v, where)}`,
      );
    return fields.length ? `{ ${fields.join(", ")} }` : "{}";
  }
  throw new Error(
    `${where}: a filter holds a ${typeof value}, and the generated register.ts can hold only a string, a number, a boolean, null, a RegExp, an array, or an object`,
  );
};
