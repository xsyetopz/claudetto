// The reader of the edit ledger of spec `session-hygiene`: one value of the private store of the plugin for each project.
// The mod runtime has no `node:` or `Bun` API, so the hash is plain JavaScript on numbers.

/** One edit: the path, the hash of the content after the edit, the session, the agent, and the origin: an `Edit` or `Write` call (`edit`), or the capture of a `Bash` call (`bash`). */
export interface LedgerLine {
	readonly path: string;
	readonly hash: string;
	readonly session: string;
	readonly agent: string;
	readonly via: "edit" | "bash";
}

/** One changed file of the work tree with the hash of its content now. */
export interface WorkFile {
	readonly path: string;
	readonly hash: string;
}

/** The hash of a file that does not exist. */
export const GONE = "gone";

const hex8 = (n: number): string => n.toString(16).padStart(8, "0");

/**
 * FNV-1a with 64 bits over the UTF-16 code units of `text`, as 16 hex digits.
 * The prime is 2^40 + 0x1b3, and the low half splits into 16-bit parts, so no product leaves the 53 bits of a number.
 */
export const hash64 = (text: string): string => {
	let hi = 0xcb_f2_9c_e4;
	let lo = 0x84_22_23_25;
	for (let i = 0; i < text.length; i++) {
		lo = (lo ^ text.charCodeAt(i)) >>> 0;
		const a = (lo & 0xff_ff) * 0x1_b3;
		const b = (lo >>> 16) * 0x1_b3;
		const sum = a + (b % 0x1_00_00) * 0x1_00_00;
		const carry = Math.floor(sum / 0x1_00_00_00_00) + Math.floor(b / 0x1_00_00);
		hi = (Math.imul(hi, 0x1_b3) + carry + (lo << 8)) >>> 0;
		lo = sum % 0x1_00_00_00_00;
	}
	return hex8(hi) + hex8(lo);
};

const TRAILING_SLASHES = /\/+$/;
const DIRECTORY_PREFIX = /^.*\//;
/** The longest base name in a key: a key of the store is at most 256 characters. */
const KEY_NAME_MAX = 100;
const RENAME_OR_COPY = /[RC]/;

/** The base name and the hash of the root path, so two projects with one base name differ. */
export const projectKey = (root: string): string => {
	const name = root.replace(TRAILING_SLASHES, "").replace(DIRECTORY_PREFIX, "");
	return `${name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, KEY_NAME_MAX)}-${hash64(root)}`;
};

/** The key of the ledger of the project at `root` in the store. */
export const ledgerKey = (root: string): string => `ledger:${projectKey(root)}`;

const VIAS = ["edit", "bash"] as const;

/** The edits in a stored value. An entry that is not an edit, or has no valid `via`, adds nothing. */
export const parseLedger = (value: unknown): LedgerLine[] =>
	Array.isArray(value)
		? value.flatMap((v: unknown) => {
				if (typeof v !== "object" || v === null) {
					return [];
				}
				const path = Reflect.get(v, "path");
				const hash = Reflect.get(v, "hash");
				const session = Reflect.get(v, "session");
				const agent = Reflect.get(v, "agent");
				const via = VIAS.find((x) => x === Reflect.get(v, "via"));
				return typeof path === "string" &&
					typeof hash === "string" &&
					typeof session === "string" &&
					typeof agent === "string" &&
					via !== undefined
					? [{ path, hash, session, agent, via }]
					: [];
			})
		: [];

/** The edits that made `path` with the content of `hash`. No line means that the user or a tool made it. */
export const madeBy = (
	lines: readonly LedgerLine[],
	path: string,
	hash: string,
): LedgerLine[] => lines.filter((l) => l.path === path && l.hash === hash);

/** Each entry of `git status --porcelain -z` as its status code and its path from the root. A rename or a copy gives its new path. */
export const statusEntries = (
	stdout: string,
): { code: string; path: string }[] => {
	const found: { code: string; path: string }[] = [];
	const entries = stdout.split("\0");
	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i] ?? "";
		if (entry.length < 4) {
			continue;
		}
		const code = entry.slice(0, 2);
		found.push({ code, path: entry.slice(3) });
		// The entry of the old name of a rename or a copy follows, with no status.
		if (RENAME_OR_COPY.test(code)) {
			i++;
		}
	}
	return found;
};

/** The paths of `git status --porcelain -z` that exist after the call: not deleted, not a folder, and the new name of a rename or a copy. */
export const statusPaths = (stdout: string): string[] =>
	statusEntries(stdout)
		.filter(({ code, path }) => !code.includes("D") && !path.endsWith("/"))
		.map(({ path }) => path);
