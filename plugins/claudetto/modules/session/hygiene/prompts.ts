export const CLEANED = (v: { list: string; size: string }): string =>
	`claudetto cleanup removed ${v.list}${v.size}.`;

export const WHO_CHANGED = (v: {
	own: string;
	others: string;
	user: string;
}): string =>
	[
		"Who changed the files of this work tree, from the edit ledger of claudetto:",
		v.own && `- This session: ${v.own}.`,
		v.others && `- Another Claude session: ${v.others}.`,
		v.user &&
			`- The user: ${v.user}. A change of the user is intended. It is part of the work tree that the user owns, so keep it, and change or stage it only when the user asks.`,
	]
		.filter(Boolean)
		.join("\n");

export const HEADINGS_CASED = (v: { path: string; count: number }): string =>
	`claudetto set the Chicago Title Case of ${v.count} heading${v.count === 1 ? "" : "s"} in \`${v.path}\`. Read the file again before the next \`Edit\` of it.`;

export const FILE_CHANGED = (v: { path: string; agent: string }): string =>
	`The user or a tool changed \`${v.path}\` after the last edit of \`${v.agent}\`.`;
