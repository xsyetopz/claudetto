// The warning before a `/model` switch drops a warm prompt cache.
// The classic hook `PreModelSwitch` asks the user on a warm cache and says nothing on a cold cache.
// It asks only for a typed `/model` command, because `ask` is a refusal in the other sources.

import { expect, test } from "bun:test";
import { switchDecision } from "../../../src/plugins/claudetto/slices/handoff/adapters/switch.ts";

const input = (warm: boolean, source = "command") => ({
  hook_event_name: "PreModelSwitch",
  source,
  from_model: "claude-sonnet-5",
  to_model: "claude-opus-5",
  context_tokens: 182340,
  prompt_cache_warm: warm,
  cache_ttl: "1h",
  estimated_cache_write_usd: 1.1396,
});

test("a warm cache asks the user and names the cost", () => {
  const o = switchDecision(input(true))?.hookSpecificOutput;
  expect(o?.hookEventName).toBe("PreModelSwitch");
  expect(o?.permissionDecision).toBe("ask");
  expect(o?.permissionDecisionReason).toContain("$1.14");
  expect(o?.permissionDecisionReason).toContain("claude-opus-5");
});

test("a cold cache says nothing", () => {
  expect(switchDecision(input(false))).toBeUndefined();
});

test("a payload with no cache field says nothing", () => {
  expect(switchDecision({})).toBeUndefined();
  expect(switchDecision(null)).toBeUndefined();
});

test("a warm cache from `picker` or `sdk` says nothing", () => {
  expect(switchDecision(input(true, "picker"))).toBeUndefined();
  expect(switchDecision(input(true, "sdk"))).toBeUndefined();
});

test("a warm cache with no `source` says nothing", () => {
  const { source: _source, ...noSource } = input(true);
  expect(switchDecision(noSource)).toBeUndefined();
});

test("a warm cache with no cost field asks with no cost sentence", () => {
  const { estimated_cache_write_usd: _usd, ...noUsd } = input(true);
  const { context_tokens: _tokens, ...noTokens } = input(true);
  for (const p of [noUsd, noTokens]) {
    const r = switchDecision(p)?.hookSpecificOutput;
    expect(r?.permissionDecision).toBe("ask");
    expect(r?.permissionDecisionReason).toContain("claude-opus-5");
    expect(r?.permissionDecisionReason).not.toContain("$");
    expect(r?.permissionDecisionReason).not.toContain("tokens");
  }
});

test("the cost sentence groups the tokens with a comma", () => {
  const r = switchDecision(input(true))?.hookSpecificOutput;
  expect(r?.permissionDecisionReason).toContain("about 182,000 tokens");
});
