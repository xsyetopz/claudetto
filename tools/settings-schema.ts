// The settings keys Claude Code reads, from the JSON Schemas that `clawdipedia` publishes for the
// version, vendored so that the gate needs no network.
//
// A key is checked against these files and not against the program's bytes. A string search over the
// 276 MB binary answers for `model` and for `agent` whether or not the program reads either as a
// settings key, and it cannot tell a key a user may write from one only an administrator may.
//
//   bun tools/settings-schema.ts            print the version and the key count of each vendored copy
//   bun tools/settings-schema.ts --fetch    download both schemas again
//   bun tools/settings-schema.ts --upstream compare the vendored copies with the published ones

import { join } from "node:path";
import { file as bunFile, write as bunWrite, CryptoHasher } from "bun";

/** One published schema: where it lives upstream and where the repository keeps its copy. */
export interface SchemaSource {
	readonly url: string;
	/** The vendored copy, relative to the repository root. */
	readonly path: string;
}

/**
 * The two schemas the checks read. `settings` is the user's own `settings.json`, which is the file
 * `just setup` writes, and `managed` adds the keys an administrator alone can set, which claudetto
 * refuses but must still name correctly.
 */
export const SCHEMAS = {
	settings: {
		url: "https://clawdipedia.cc/schemas/claude-code-settings.json",
		path: "docs/keep/settings/claude-code-settings.schema.json",
	},
	managed: {
		url: "https://clawdipedia.cc/schemas/claude-code-managed-settings.json",
		path: "docs/keep/settings/claude-code-managed-settings.schema.json",
	},
} as const satisfies Readonly<Record<string, SchemaSource>>;

/** Which schema a check reads: the user settings file or the managed one. */
export type SchemaName = keyof typeof SCHEMAS;

const ROOT = join(import.meta.dir, "..");

/** A vendored schema, as the checks read it. */
export interface SettingsSchema {
	/** The title the document carries, which names the Claude Code version it was built for. */
	readonly title: string;
	/** The top-level property names, which are the settings keys Claude Code reads. */
	readonly keys: readonly string[];
	/** The keys the schema flags `x-managed-only`, which Claude Code ignores outside managed settings. */
	readonly managedOnly: readonly string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const managedOnlyOf = (
	properties: Readonly<Record<string, unknown>>,
): readonly string[] =>
	Object.entries(properties)
		.filter(([, body]) => isRecord(body) && body["x-managed-only"] === true)
		.map(([name]) => name);

const parse = (text: string, where: string): SettingsSchema => {
	const doc: unknown = JSON.parse(text);
	if (!isRecord(doc)) {
		throw new Error(`${where} is not a JSON object`);
	}
	const title = doc["title"];
	const properties = doc["properties"];
	if (typeof title !== "string" || !isRecord(properties)) {
		throw new Error(
			`${where} has no title and properties of a settings schema`,
		);
	}
	return {
		title,
		keys: Object.keys(properties),
		managedOnly: managedOnlyOf(properties),
	};
};

/** The vendored schema of `name`. A missing file throws, because a check that passes with no schema checks nothing. */
export const schemaOf = async (name: SchemaName): Promise<SettingsSchema> => {
	const source = SCHEMAS[name];
	return parse(await bunFile(join(ROOT, source.path)).text(), source.path);
};

/** Every key either schema holds, which is what a name claudetto refuses is checked against. */
export const everyKey = async (): Promise<readonly string[]> => {
	const [settings, managed] = await Promise.all([
		schemaOf("settings"),
		schemaOf("managed"),
	]);
	return [...new Set([...settings.keys, ...managed.keys])];
};

/** The names of `names` that neither schema holds, in the order given. */
export const keysMissing = async (
	names: readonly string[],
): Promise<readonly string[]> => {
	const known = await everyKey();
	return names.filter((name) => !known.includes(name));
};

const fetchText = async (url: string): Promise<string> => {
	const answer = await fetch(url);
	if (!answer.ok) {
		throw new Error(`${url}: ${answer.status}`);
	}
	return answer.text();
};

const digest = (text: string): string =>
	new CryptoHasher("sha256").update(text).digest("hex");

const line = (schema: SettingsSchema, where: string): string =>
	`${where}: ${schema.title}, ${schema.keys.length} keys`;

const bothNames = (): readonly SchemaName[] => ["settings", "managed"];

const fetchAll = async (): Promise<void> => {
	const texts = await Promise.all(
		bothNames().map((name) => fetchText(SCHEMAS[name].url)),
	);
	await Promise.all(
		bothNames().map((name, at) => {
			const text = texts[at] ?? "";
			parse(text, SCHEMAS[name].url);
			return bunWrite(join(ROOT, SCHEMAS[name].path), text);
		}),
	);
	for (const [at, name] of bothNames().entries()) {
		const text = texts[at] ?? "";
		console.info(
			`${line(parse(text, name), SCHEMAS[name].path)}, sha256 ${digest(text)}`,
		);
	}
};

const compareUpstream = async (): Promise<void> => {
	const pairs = await Promise.all(
		bothNames().map(async (name) => ({
			name,
			vendored: await bunFile(join(ROOT, SCHEMAS[name].path)).text(),
			live: await fetchText(SCHEMAS[name].url),
		})),
	);
	const stale = pairs.filter(
		(pair) => digest(pair.vendored) !== digest(pair.live),
	);
	for (const pair of pairs) {
		console.info(
			line(parse(pair.vendored, pair.name), SCHEMAS[pair.name].path),
		);
		console.info(`  published: ${parse(pair.live, pair.name).title}`);
	}
	if (stale.length === 0) {
		console.info("Each vendored copy is the published one.");
		return;
	}
	throw new Error(
		`${stale.map((pair) => SCHEMAS[pair.name].path).join(", ")} differ from the published schemas. Run \`just settings-schema --fetch\`.`,
	);
};

const main = async (): Promise<void> => {
	const args = process.argv.slice(2);
	if (args.includes("--fetch")) {
		return fetchAll();
	}
	if (args.includes("--upstream")) {
		return compareUpstream();
	}
	const schemas = await Promise.all(bothNames().map(schemaOf));
	for (const [at, name] of bothNames().entries()) {
		const schema = schemas[at];
		if (schema !== undefined) {
			console.info(line(schema, SCHEMAS[name].path));
		}
	}
};

if (import.meta.main) {
	await main();
}
