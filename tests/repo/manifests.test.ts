// Each plugin manifest has the same description as its entry in the marketplace,
// and has the fields that a user sees in a listing.

import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { file as bunFile } from "bun";
import { PLUGINS, REPO } from "../support/repo.ts";

/** The fields of a plugin manifest that the tests read. */
interface Manifest {
	$schema?: string;
	description?: string;
	keywords?: string[];
	homepage?: string;
}

/** The entries of the marketplace that the tests read. */
interface Marketplace {
	plugins: { name: string; description?: string }[];
}

const SCHEMA_URL = /^https:\/\/.+\.json$/;
const HOMEPAGE_URL = /^https:\/\/github\.com\/xsyetopz\/claudetto(?:\/|$)/;

const readJson = async <T>(file: string): Promise<T> =>
	await bunFile(file).json();
const marketplace = await readJson<Marketplace>(
	path.join(REPO, ".claude-plugin", "marketplace.json"),
);
const manifestPath = (name: string): string =>
	path.join(PLUGINS, name, ".claude-plugin", "plugin.json");
const plugins = await readdir(PLUGINS);
const hasManifest = await Promise.all(
	plugins.map((name) => bunFile(manifestPath(name)).exists()),
);
const NAMES = plugins.filter((_, i) => hasManifest[i]);
const MANIFESTS = await Promise.all(
	NAMES.map((name) => readJson<Manifest>(manifestPath(name))),
);

test("the marketplace lists each plugin once", () => {
	const listed = marketplace.plugins
		.map((p) => p.name)
		.sort((a, b) => a.localeCompare(b));
	expect(listed).toStrictEqual([...NAMES].sort((a, b) => a.localeCompare(b)));
});

for (const [index, name] of NAMES.entries()) {
	const manifest = MANIFESTS[index] ?? {};

	test(`${name} has the same description in \`plugin.json\` and the marketplace`, () => {
		const entry = marketplace.plugins.find((p) => p.name === name);
		expect(entry, name).toBeTruthy();
		expect(manifest.description).toBeTruthy();
		expect(entry?.description).toBe(manifest.description);
	});

	test(`${name} has \`$schema\`, \`keywords\`, and \`homepage\``, () => {
		expect(manifest.$schema).toMatch(SCHEMA_URL);
		expect(
			Array.isArray(manifest.keywords) && manifest.keywords.length > 0,
			"keywords",
		).toBeTruthy();
		expect(manifest.homepage).toMatch(HOMEPAGE_URL);
	});
}
