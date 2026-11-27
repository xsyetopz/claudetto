import type { On } from "claude-code";

import { AMEND_SECTION, AMEND_SECTION_ID, SPECS_DIR } from "../texts";

/**
 * Appends {@link AMEND_SECTION} as the last session section when the repo has `specs/`.
 * A session section sits after the cache boundary, so the shared prefix stays cached.
 *
 * @param on The engine's hook registrar.
 */
export function registerAmendSection(on: On): void {
	on("prompt.compose", async ($, e, next) => {
		const composed = await next(e);
		if (
			e.traits.includes("bare") ||
			composed.sections.some((s) => s.id === AMEND_SECTION_ID) ||
			!(await $.fs.exists(SPECS_DIR))
		) {
			return composed;
		}
		return {
			sections: [
				...composed.sections,
				{ id: AMEND_SECTION_ID, scope: "session", text: AMEND_SECTION }
			]
		};
	}).catch(($, e, next) => {
		$.ui.log("prompt compose failed", { to: "debug" });
		return next(e);
	});
}
