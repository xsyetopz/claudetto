import { REFUSE_FOREIGN, REFUSE_NO_MARKER } from "../prompts.ts";

export const SANDBOX_LAYOUT: readonly string[] = ["config", "project", "home"];

export const SANDBOX_MARKER = ".claudetto-sandbox";

export const cleanRefusal = (
	root: string,
	entries: readonly string[],
	isDefault: boolean,
): string | null => {
	if (isDefault) {
		return null;
	}
	const foreign = entries.filter(
		(e) => e !== SANDBOX_MARKER && !SANDBOX_LAYOUT.includes(e),
	);
	if (foreign.length > 0) {
		return REFUSE_FOREIGN({ root, foreign: foreign.join(", ") });
	}
	if (!entries.includes(SANDBOX_MARKER)) {
		return REFUSE_NO_MARKER({ root, marker: SANDBOX_MARKER });
	}
	return null;
};
