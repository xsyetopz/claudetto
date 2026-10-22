// The subagent cap of the plan of the login (design D3).

import { PLAN_CAPS } from "../limits.ts";
import { isObject } from "./merge.ts";

/** The cap of `PLAN_CAPS` for the login in the state file `state`, and the tier that sets it, or the tiers that it found (`none` with no login). */
export const planCap = (
  state: unknown,
): { cap: number | undefined; tier: string } => {
  const account =
    isObject(state) && isObject(state["oauthAccount"])
      ? state["oauthAccount"]
      : {};
  const names = [
    account["organizationRateLimitTier"],
    account["organizationType"],
  ].filter((n): n is string => typeof n === "string");
  const known = names.find((n) => Object.hasOwn(PLAN_CAPS, n));
  if (known) return { cap: PLAN_CAPS[known], tier: known };
  return { cap: undefined, tier: names.join(", ") || "none" };
};
