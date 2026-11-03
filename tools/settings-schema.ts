// Checked against the schema, not the binary: a byte search cannot tell a user key from a managed one.
// Each lookup fetches the published original and keeps no copy, so a check never reads stale bytes.
// Usage: bun tools/settings-schema.ts

/** `managed` adds the keys only an administrator can set, which claudetto refuses but must name right. */
export const SCHEMAS = {
	settings: "https://clawdipedia.cc/schemas/claude-code-settings.json",
	managed: "https://clawdipedia.cc/schemas/claude-code-managed-settings.json",
} as const satisfies Readonly<Record<string, string>>;

export type SchemaName = keyof typeof SCHEMAS;

/** The index page links one page per group of env vars, and each group page has one table row per name. */
export const ENV_INDEX = "https://clawdipedia.cc/configure/env-vars.md";

export interface SettingsSchema {
	readonly id: string;
	readonly title: string;
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
	const { $id: id, title, properties } = doc;
	if (
		typeof id !== "string" ||
		typeof title !== "string" ||
		!isRecord(properties)
	) {
		throw new Error(
			`${where} has no $id, title and properties of a settings schema`,
		);
	}
	return {
		id,
		title,
		keys: Object.keys(properties),
		managedOnly: managedOnlyOf(properties),
	};
};

/** A failed fetch throws, because a check that passes with no schema checks nothing. */
const fetchText = async (url: string): Promise<string> => {
	const answer = await fetch(url);
	if (!answer.ok) {
		throw new Error(`${url}: ${answer.status}`);
	}
	return answer.text();
};

const fetched = new Map<string, Promise<string>>();

// One fetch per URL per process: the test files of one run share it, and nothing is written.
const textOf = (url: string): Promise<string> => {
	const known = fetched.get(url);
	if (known !== undefined) {
		return known;
	}
	const text = fetchText(url);
	fetched.set(url, text);
	return text;
};

export const schemaOf = async (name: SchemaName): Promise<SettingsSchema> =>
	parse(await textOf(SCHEMAS[name]), SCHEMAS[name]);

export const everyKey = async (): Promise<readonly string[]> => {
	const [settings, managed] = await Promise.all([
		schemaOf("settings"),
		schemaOf("managed"),
	]);
	return [...new Set([...settings.keys, ...managed.keys])];
};

export const keysMissing = async (
	names: readonly string[],
): Promise<readonly string[]> => {
	const known = await everyKey();
	return names.filter((name) => !known.includes(name));
};

/** The group pages that the index links, each once. */
export const pagesOf = (index: string): readonly string[] => [
	...new Set(
		index.match(
			/https:\/\/clawdipedia\.cc\/configure\/env-vars\/[a-z0-9-]+\.md/g,
		) ?? [],
	),
];

/** A name is the first cell of a table row, so a name the prose only mentions is not one. */
export const envNamesOf = (page: string): readonly string[] =>
	[...page.matchAll(/^\| `([A-Z][A-Z0-9_]+)` \|/gm)].flatMap((match) =>
		match[1] === undefined ? [] : [match[1]],
	);

export const documentedEnv = async (): Promise<readonly string[]> => {
	const pages = pagesOf(await textOf(ENV_INDEX));
	if (pages.length === 0) {
		throw new Error(`${ENV_INDEX} links no group page`);
	}
	const texts = await Promise.all(pages.map(textOf));
	return [...new Set(texts.flatMap(envNamesOf))];
};

const main = async (): Promise<void> => {
	const names = ["settings", "managed"] as const;
	const schemas = await Promise.all(names.map(schemaOf));
	for (const [at, schema] of schemas.entries()) {
		console.info(
			`${SCHEMAS[names[at] ?? "settings"]}: ${schema.title}, ${schema.keys.length} keys`,
		);
	}
	console.info(`${ENV_INDEX}: ${(await documentedEnv()).length} env names`);
};

if (import.meta.main) {
	await main();
}
