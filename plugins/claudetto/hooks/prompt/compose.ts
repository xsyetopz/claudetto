import type { On, PromptComposeSection } from "claude-code";

import { fault } from "../shared/fault";
import { CONDUCT, CONDUCT_ID } from "./conduct";
import { memorySection } from "./memory";

/**
 * Inserts the conduct section (REQ-TOOLS-032) directly after the last shared
 * section, so every shared section stays ahead of every session one and the
 * cache boundary holds. A list without a shared section gets it first; a list
 * that already has the id is left as it is. `--bare` composes one minimal
 * section and gets none.
 */
const withConduct = (
	sections: readonly PromptComposeSection[]
): readonly PromptComposeSection[] => {
	if (sections.some((section) => section.id === CONDUCT_ID)) {
		return sections;
	}
	const at = sections.findLastIndex((section) => section.scope === "shared");
	return [
		...sections.slice(0, at + 1),
		{ id: CONDUCT_ID, scope: "shared", text: CONDUCT },
		...sections.slice(at + 1)
	];
};

/**
 * Points the `memory` section at `patch` and adds the conduct section. Every
 * other section stays as the engine wrote it, and sections keep their order,
 * so shared ones stay ahead of session ones and the cache boundary does not move.
 */
export function registerCompose(on: On): void {
	on("prompt.compose", async (_$, e, next) => {
		const composed = await next(e);
		const sections = composed.sections.map((section) => {
			if (section.id === "memory") {
				return {
					id: section.id,
					scope: section.scope,
					text: memorySection(section.text, e.tools)
				};
			}
			return section;
		});
		return {
			sections: e.traits.includes("bare") ? sections : withConduct(sections)
		};
	}).catch(($, e, next) => {
		fault($, "prompt compose", next.error);
		return next(e);
	});
}
