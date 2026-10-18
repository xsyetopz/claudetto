// The warning before a `/model` switch drops a warm prompt cache.
// The classic hook `PreModelSwitch` asks the user on a warm cache and says nothing on a cold cache.

import { expect, test } from "bun:test";
import { switchDecision } from "../../../src/plugins/claudetto/slices/handoff/adapters/switch.ts";

const input = (warm: boolean) => ({
  hook_event_name: "PreModelSwitch",
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
