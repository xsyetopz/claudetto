// The classic hook `PreModelSwitch`: asks the user to confirm a `/model` switch that drops a warm prompt cache.
// Claude Code has no mod event for a model switch.
// The hook input has the cost (`estimated_cache_write_usd`), so the hook only decides and quotes it.

import { runHook } from "../../../../../kernel/node/hook-io.ts";
import { SWITCH_WARNING } from "../prompts.ts";

/** The `PreModelSwitch` fields that the warning uses. */
interface SwitchInput {
  readonly to_model?: unknown;
  readonly context_tokens?: unknown;
  readonly prompt_cache_warm?: unknown;
  readonly cache_ttl?: unknown;
  readonly estimated_cache_write_usd?: unknown;
}

const numberOr0 = (v: unknown): number => (typeof v === "number" ? v : 0);

/** The output that asks the user to confirm a switch on a warm cache, or `undefined` on a cold cache (the switch goes on with no message). */
export const switchDecision = (payload: unknown) => {
  const p = (payload ?? {}) as SwitchInput;
  if (p.prompt_cache_warm !== true) return undefined;
  return {
    hookSpecificOutput: {
      hookEventName: "PreModelSwitch",
      permissionDecision: "ask",
      permissionDecisionReason: SWITCH_WARNING({
        ttl: String(p.cache_ttl ?? "1h"),
        model: String(p.to_model ?? "the new model"),
        tokens: String(Math.round(numberOr0(p.context_tokens) / 1000) * 1000),
        usd: numberOr0(p.estimated_cache_write_usd).toFixed(2),
      }),
    },
  };
};

if (import.meta.main) await runHook(switchDecision);
