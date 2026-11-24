/** Reads a file's text, or `undefined` when it is missing or unreadable. */
export type Reader = (path: string) => Promise<string | undefined>;

const REF_PREFIX = "ref: refs/heads/";
const HASH = /^[0-9a-f]{40,64}$/u;
const GITDIR = /^gitdir:\s*(.+)$/mu;
/** Folders walked up looking for the repository; bounds the reads of one render. */
const MAX_PARENTS = 8;

const branchOfHead = (head: string): string | undefined => {
	const text = head.trim();
	if (text.startsWith(REF_PREFIX)) {
		return text.slice(REF_PREFIX.length) || undefined;
	}
	return HASH.test(text) ? text.slice(0, 7) : undefined;
};

const parentOf = (dir: string): string | undefined => {
	const cut = dir.lastIndexOf("/");
	return cut > 0 ? dir.slice(0, cut) : undefined;
};

const headOf = async (
	dir: string,
	read: Reader,
	parents: number
): Promise<string | undefined> => {
	const head = await read(`${dir}/.git/HEAD`);
	if (head !== undefined) {
		return head;
	}
	const target = GITDIR.exec((await read(`${dir}/.git`)) ?? "")?.[1]?.trim();
	if (target !== undefined && target !== "") {
		return read(`${target.startsWith("/") ? target : `${dir}/${target}`}/HEAD`);
	}
	const parent = parentOf(dir);
	return parent === undefined || parents === 0
		? undefined
		: headOf(parent, read, parents - 1);
};

/**
 * The branch checked out in the repository holding the absolute path `dir`,
 * read from `HEAD` with no git process (stdin names a branch only for a
 * worktree); a detached head gives its first seven hash characters.
 */
export const branchOf = async (
	dir: string,
	read: Reader
): Promise<string | undefined> => {
	const head = await headOf(dir, read, MAX_PARENTS);
	return head === undefined ? undefined : branchOfHead(head);
};
