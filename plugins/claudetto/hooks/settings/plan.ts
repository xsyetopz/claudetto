import type { EngineInterface } from "claude-code";

import { fieldOf } from "../shared/field";
import type { Json } from "./settings";

/** The subscription a fill is sized for: `api` covers an API key, a Console login and a cloud provider. */
export type Plan = "api" | "pro" | "max5" | "max20" | "org";

/**
 * The subagents run at once per plan. Each one spends the same 5-hour and 7-day windows as the
 * lead, so a Pro window gets two and a Max 20x window five; the rest keep the Max 5x figure.
 */
const CONCURRENT: Record<Plan, string> = {
	api: "3",
	pro: "2",
	max5: "3",
	max20: "5",
	org: "3"
};

/** The settings that depend on the plan. */
export const planSettings = (plan: Plan): Json => ({
	env: { CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: CONCURRENT[plan] }
});

/** Claude Code's global config: `.claude.json` in `CLAUDE_CONFIG_DIR` when set, else in the home folder. */
async function globalConfigPath($: EngineInterface): Promise<string> {
	const config = await $.env.get("CLAUDE_CONFIG_DIR");
	return config !== undefined && config !== ""
		? `${config}/.claude.json`
		: `${await $.env.get("HOME")}/.claude.json`;
}

/**
 * The plan from the login record Claude Code keeps in its global config: `organizationType`
 * `claude_pro` or `claude_max`, and for Max the `organizationRateLimitTier`
 * (`default_claude_max_5x` or `default_claude_max_20x`), the fields claude 2.1.329 reads for the
 * same purpose. `$.session.identity` answers a user-tier plugin `{ deny }`, so the record is read.
 */
export async function planOf($: EngineInterface): Promise<Plan> {
	try {
		const path = await globalConfigPath($);
		if (!(await $.fs.exists(path))) {
			return "api";
		}
		const account = fieldOf(JSON.parse(await $.fs.read(path)), "oauthAccount");
		const type = fieldOf(account, "organizationType");
		if (type === "claude_pro") {
			return "pro";
		}
		if (type === "claude_max") {
			return fieldOf(account, "organizationRateLimitTier") ===
				"default_claude_max_20x"
				? "max20"
				: "max5";
		}
		return type === undefined ? "api" : "org";
	} catch {
		// An unreadable record sizes the fill as today's default, the Max 5x figures.
		return "max5";
	}
}
