// The mod runtime has no `node:` or `Bun` API, so the hash is plain JavaScript on numbers.

export interface LedgerLine {
	readonly path: string;
	readonly hash: string;
	readonly session: string;
	readonly agent: string;
	readonly via: "edit" | "bash";
}

export interface WorkFile {
	readonly path: string;
	readonly hash: string;
}

export const GONE = "gone";

const hex8 = (n: number): string => n.toString(16).padStart(8, "0");

/** The prime is 2^40 + 0x1b3 and the low half splits into 16-bit parts, so no product exceeds 53 bits. */
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
/** A key of the store is at most 256 characters. */
const KEY_NAME_MAX = 100;
const RENAME_OR_COPY = /[RC]/;

/** The hash of the root path keeps two projects with one base name apart. */
export const projectKey = (root: string): string => {
	const name = root.replace(TRAILING_SLASHES, "").replace(DIRECTORY_PREFIX, "");
	return `${name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, KEY_NAME_MAX)}-${hash64(root)}`;
};

export const ledgerKey = (root: string): string => `ledger:${projectKey(root)}`;

const VIAS = ["edit", "bash"] as const;

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

export const madeBy = (
	lines: readonly LedgerLine[],
	path: string,
	hash: string,
): LedgerLine[] => lines.filter((l) => l.path === path && l.hash === hash);

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
		// The old name of a rename or a copy follows, with no status.
		if (RENAME_OR_COPY.test(code)) {
			i++;
		}
	}
	return found;
};

export const statusPaths = (stdout: string): string[] =>
	statusEntries(stdout)
		.filter(({ code, path }) => !code.includes("D") && !path.endsWith("/"))
		.map(({ path }) => path);
