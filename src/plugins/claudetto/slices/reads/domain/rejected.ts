// The pure parts of the rejected-call gate of the `reads` slice.
// A `tool.call` hook wraps the permission check and its dialog, so the result of `next` shows a rejection in the dialog.

/**
 * The text that Claude Code stores as the result of a call that the user rejected in the dialog.
 * Source: the constant `fht="User rejected tool use"` in the bundle of Claude Code 2.1.301.
 * The engine writes it as `toolUseResult` of the row of that `tool_result` (`is_error: true`), and the hook gets it as `result` (decision D61).
 */
export const REJECTED_RESULT = "User rejected tool use";

/** The fields of the result of `next` that the test reads. */
export interface CallOutcome {
  readonly isError?: unknown;
  readonly result?: unknown;
}

/** True when the outcome of a call is a rejection of the user in the dialog. The test is an exact compare, not a match on words. */
export const isRejected = (out: CallOutcome): boolean =>
  out.isError === true && out.result === REJECTED_RESULT;

/** The JSON text of a value with the keys of each object in order, so that equal inputs give equal text. */
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
};

/** A 53-bit hash of a text (cyrb53), as a hex string. */
const hash = (text: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};

/** The key of a call: the tool and the hash of its input. */
export const callKey = (tool: string, input: unknown): string =>
  `${tool}:${hash(canonical(input))}`;

/** The input of a call: the event without the fields that the engine sets. */
export const inputOf = (event: object): Record<string, unknown> => {
  const {
    tool: _t,
    tool_use_id: _i,
    agentId: _a,
    ...input
  } = event as Record<string, unknown>;
  return input;
};

/** The set `into` with `value` added last. When the set is over `max`, the oldest values go. */
export const remember = <T>(into: Set<T>, value: T, max: number): Set<T> => {
  into.delete(value);
  into.add(value);
  for (const old of into) {
    if (into.size <= max) break;
    into.delete(old);
  }
  return into;
};
