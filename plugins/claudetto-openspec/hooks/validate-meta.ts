// A change's `.openspec.yaml`: the markers it sets and whether the file is valid enough to honor them.
import { dirname, type Fs, join } from "./fs.ts";
import { parseYaml } from "./yaml.ts";

const SKIP_MENTION = /^\s*(['"]?)skip_specs\1\s*:/mu;
const EXTENSION_KEY = /^x-\S+$/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/u;
const METADATA_KEYS = new Set([
	"schema",
	"created",
	"goal",
	"affected_areas",
	"initiative",
	"skip_specs",
	"retire_capabilities",
]);

interface Read {
	raw?: string;
	error?: string;
	missing?: boolean;
}

const readable = async (fs: Fs, file: string): Promise<Read> => {
	if (!(await fs.exists(file))) {
		return { missing: true };
	}
	try {
		return { raw: await fs.read(file) };
	} catch (error) {
		return { error: error instanceof Error ? error.message : String(error) };
	}
};

const isMap = (v: unknown): v is Record<string, unknown> =>
	Boolean(v) && typeof v === "object" && !Array.isArray(v);

const schemaResolves = async (fs: Fs, dir: string, name: string) => {
	if (name === "spec-driven") {
		return true;
	}
	if (name.includes("/")) {
		return false;
	}
	const root = dirname(dirname(dirname(dir)));
	const { raw } = await readable(
		fs,
		join(root, "openspec", "schemas", name, "schema.yaml"),
	);
	const parsed = raw === undefined ? undefined : parseYaml(raw);
	return (
		raw !== undefined &&
		isMap(parsed) &&
		typeof parsed["name"] === "string" &&
		parsed["version"] !== undefined &&
		Array.isArray(parsed["artifacts"])
	);
};

interface Marker {
	on: boolean;
	invalid?: string;
}
export interface Meta {
	skip: boolean;
	retire: boolean;
	unknown: string[];
	invalid?: string;
}

// A boolean marker is honored only when the whole metadata file is valid and its schema resolves.
const markerState = async (
	fs: Fs,
	dir: string,
	parsed: Record<string, unknown>,
	key: string,
): Promise<Marker> => {
	const { schema, created } = parsed;
	const value = parsed[key];
	if (value === undefined || value === false) {
		return { on: false };
	}
	const shape =
		value === true &&
		typeof schema === "string" &&
		schema !== "" &&
		(created === undefined ||
			(typeof created === "string" && DATE.test(created)));
	if (!(shape && typeof schema === "string")) {
		return { on: false, invalid: "the metadata does not match the schema" };
	}
	return (await schemaResolves(fs, dir, schema))
		? { on: true }
		: { on: false, invalid: `schema: unknown schema '${schema}'` };
};

const NONE: Meta = { skip: false, retire: false, unknown: [] };

export const metadata = async (fs: Fs, dir: string): Promise<Meta> => {
	const file = await readable(fs, join(dir, ".openspec.yaml"));
	if (file.raw === undefined) {
		return file.missing === true
			? NONE
			: {
					...NONE,
					invalid: `the metadata file cannot be read (${file.error})`,
				};
	}
	const parsed = parseYaml(file.raw);
	if (parsed === undefined) {
		return {
			...NONE,
			...(SKIP_MENTION.test(file.raw) && {
				invalid: "the file is not valid YAML",
			}),
		};
	}
	if (!isMap(parsed)) {
		return NONE;
	}
	const unknown = Object.keys(parsed)
		.filter((k) => !(METADATA_KEYS.has(k) || EXTENSION_KEY.test(k)))
		.toSorted((x, y) => (x < y ? -1 : 1));
	const skip = await markerState(fs, dir, parsed, "skip_specs");
	const retire = await markerState(fs, dir, parsed, "retire_capabilities");
	return {
		skip: skip.on,
		retire: retire.on,
		unknown,
		...(skip.invalid !== undefined && { invalid: skip.invalid }),
	};
};
