// The content that an `Edit` or `Write` call will write (spec `session-hygiene`, "Edit Ledger"), so the ledger holds its hash before the call runs.

/** The text after `old` becomes `next` in `text`: every match when `all`, else the one match. `null` when `old` is empty, does not match, or (with no `all`) matches more than once, because the call then fails. */
export const afterEdit = (
	text: string,
	old: string,
	next: string,
	all: boolean,
): string | null => {
	const first = old === "" ? -1 : text.indexOf(old);
	if (first < 0) {
		return null;
	}
	if (all) {
		return text.split(old).join(next);
	}
	return text.indexOf(old, first + old.length) < 0
		? text.slice(0, first) + next + text.slice(first + old.length)
		: null;
};
