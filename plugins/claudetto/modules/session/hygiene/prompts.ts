export const CLEANED = (v: { list: string; size: string }): string =>
	`claudetto cleanup removed ${v.list}${v.size}.`;

export const HEADINGS_CASED = (v: { path: string; count: number }): string =>
	`claudetto changed ${v.count} heading${v.count === 1 ? "" : "s"} in \`${v.path}\` to Chicago Title Case. Read the file again before the next \`Edit\` of it.`;
