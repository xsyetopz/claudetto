// Reads the `stream-json` events of one run: the init event, the result
// event, and the tool trace. Also the scripted user, which sends a claim of
// fault after a given turn.

/** The events of a JSON Lines text. A line that is not JSON is skipped. */
export function parseEvents(text) {
  const out = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {}
  }
  return out;
}

export const initEvent = (events) =>
  events.find((e) => e.type === "system" && e.subtype === "init");

export const resultEvent = (events) =>
  events.findLast((e) => e.type === "result");

const blocks = (e) =>
  Array.isArray(e?.message?.content) ? e.message.content : [];

const text = (c) =>
  typeof c === "string"
    ? c
    : Array.isArray(c)
      ? c.map((b) => b?.text ?? "").join("")
      : "";

/**
 * The ordered trace: `{kind:"text", text, turn}`, `{kind:"call", id, name,
 * input, turn}`, and `{kind:"result", id, error, output}`.
 * A turn is one assistant event.
 */
export function trace(events) {
  const out = [];
  let turn = 0;
  for (const e of events) {
    if (e.type === "assistant") {
      turn += 1;
      for (const b of blocks(e)) {
        if (b.type === "text") out.push({ kind: "text", text: b.text, turn });
        if (b.type === "tool_use") {
          const { id, name, input } = b;
          out.push({ kind: "call", id, name, input: input ?? {}, turn });
        }
      }
    } else if (e.type === "user") {
      for (const b of blocks(e)) {
        if (b.type !== "tool_result") continue;
        out.push({
          kind: "result",
          id: b.tool_use_id,
          error: b.is_error === true,
          output: text(b.content),
        });
      }
    }
  }
  return out;
}

/**
 * The effect measures of a run, from its result event.
 * A run that timed out has no result event, so it is charged `timeoutCharge` and marked `estimated`.
 */
export function usageOf(events, { timedOut = false, timeoutCharge = 0 } = {}) {
  const r = resultEvent(events) ?? {};
  const u = r.usage ?? {};
  const estimated = timedOut && !resultEvent(events);
  return {
    cost: estimated ? timeoutCharge : Number(r.total_cost_usd) || 0,
    estimated,
    input: u.input_tokens ?? 0,
    output: u.output_tokens ?? 0,
    cacheRead: u.cache_read_input_tokens ?? 0,
    cacheWrite: u.cache_creation_input_tokens ?? 0,
    turns: r.num_turns ?? trace(events).filter((t) => t.kind === "text").length,
    ms: r.duration_ms ?? 0,
    final: typeof r.result === "string" ? r.result : "",
  };
}

/**
 * The user of a case file. `claims` is `[{atTurn, text}]`.
 * `onEvent` returns the messages to send after an event, and sends each
 * claim once, after the assistant turn it names.
 */
export class ScriptedUser {
  constructor(claims = []) {
    this.pending = [...claims].sort((a, b) => a.atTurn - b.atTurn);
    this.turn = 0;
  }
  onEvent(event) {
    if (event.type !== "assistant") return [];
    this.turn += 1;
    const sent = [];
    while (this.pending.length && this.pending[0].atTurn <= this.turn) {
      sent.push(this.pending.shift().text);
    }
    return sent;
  }
}
