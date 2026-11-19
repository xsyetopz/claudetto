import type { On, ToolCheckResult } from "claude-code";
import { fault } from "../fault";

/**
 * Names the source of a deny that no person made, from core's structured verdict.
 *
 * @param verdict A `tool.check` verdict.
 * @returns The sentence to add to the model's error, or undefined when the verdict is not a deny or names no source.
 */
export const denialSource = (verdict: ToolCheckResult): string | undefined => {
	if (verdict.decision !== "deny") return undefined;
	const source =
		verdict.rule !== undefined
			? `the permission rule \`${verdict.rule}\` in the settings`
			: verdict.hook !== undefined
				? `a ${verdict.hook} hook`
				: verdict.setting !== undefined
					? `the \`${verdict.setting}\` setting`
					: undefined;
	return source === undefined ? undefined : `Denied by ${source}; no permission prompt was shown and no person declined it.`;
};

/**
 * Adds the denial source to the model's error (RISK-503, issue #50).
 *
 * Engine limit (2.1.327): a deny from a settings rule reaches the model as
 * "Permission to use Bash with command … has been denied." with no source,
 * while the system prompt says a denied call is one the user declined at a
 * prompt (chunk-m14bt1pz.js:142897), so the reply names the user or the
 * prompt. A person's own decline at a prompt is not a `tool.check` deny and
 * keeps its own text. Remove once core's deny text names its rule, hook or
 * setting.
 */
export function registerDenial(on: On): void {
	on("tool.check", async (_$, e, next) => {
		const verdict = await next(e);
		const source = denialSource(verdict);
		if (source === undefined) return verdict;
		return { ...verdict, reason: verdict.reason === undefined ? source : `${verdict.reason} ${source}` };
	}).catch(($, e, next) => (fault($, "denial source", next.error), next(e)));
}
