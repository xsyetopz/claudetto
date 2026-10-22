// The classic hook `PreModelSwitch`: asks the user to confirm a `/model` switch that drops a warm prompt cache.
// Claude Code has no mod event for a model switch.
// `ask` works only for a typed `/model` command (`source` is `command`), and it is a refusal in the other sources, so the hook says nothing there.
// The hook input has the cost (`estimated_cache_write_usd`), so the hook only decides and quotes it.

import { runHook } from "../../../kernel/node/hook-io.ts";
import { SWITCH_COST, SWITCH_WARNING } from "../prompts.ts";

interface SwitchInput {
  readonly source?: unknown;
  readonly to_model?: unknown;
  readonly context_tokens?: unknown;
  readonly prompt_cache_warm?: unknown;
  readonly cache_ttl?: unknown;
  readonly estimated_cache_write_usd?: unknown;
}

const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** The output that asks the user to confirm a switch on a warm cache, or `undefined` on a cold cache or for a `source` other than `command` (the switch goes on with no message).
 * The cost sentence is left out when `context_tokens` or `estimated_cache_write_usd` is not a number, because a cost of `$0.00` reads as free. */
export const switchDecision = (payload: unknown) => {
  const p = (payload ?? {}) as SwitchInput;
  if (p.source !== "command" || p.prompt_cache_warm !== true) return undefined;
  const head = SWITCH_WARNING({
    ttl: String(p.cache_ttl ?? "1h"),
    model: String(p.to_model ?? "the new model"),
  });
  const reason =
    isNumber(p.context_tokens) && isNumber(p.estimated_cache_write_usd)
      ? `${head}\n${SWITCH_COST({
          tokens: (Math.round(p.context_tokens / 1000) * 1000).toLocaleString(
            "en-US",
          ),
          usd: p.estimated_cache_write_usd.toFixed(2),
        })}`
      : head;
  return {
    hookSpecificOutput: {
      hookEventName: "PreModelSwitch",
      permissionDecision: "ask",
      permissionDecisionReason: reason,
    },
  };
};

if (import.meta.main) await runHook(switchDecision);
