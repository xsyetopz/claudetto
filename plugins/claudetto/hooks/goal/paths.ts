/**
 * A path-like token: a word with a slash in it (`src/a.ts`, `./x`, `~/y`), or
 * a bare file name with a letter-led extension (`README.md`). The lead-in
 * keeps a URL's host and path out, since a URL's `/` follows a colon.
 */
const TOKEN =
	/(?:^|[\s"'`([])((?:~|\.{1,2})?\/?[\w.@-]+(?:\/[\w.@-]+)+\/?|[\w-]+\.[A-Za-z][A-Za-z0-9]{0,5})(?=$|[\s"'`)\],;:?!])/gu;

/** Abbreviations and host names that read as a file name and are not one. */
const NOT_FILES = /^(?:e\.g|i\.e|[\w-]+\.(?:com|org|net|io|dev|app|ai))$/iu;

/**
 * The paths a goal condition names, in order, once each. A condition such as
 * "src/a.ts passes lint" names `src/a.ts`; "the file x exists" names none.
 *
 * @param condition The text after `/goal`.
 */
export const pathsIn = (condition: string): string[] => {
	const found = new Set<string>();
	for (const match of condition.matchAll(TOKEN)) {
		const token = match[1];
		if (token !== undefined && !NOT_FILES.test(token)) {
			found.add(token);
		}
	}
	return [...found];
};
