import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
	type Declared,
	declaredIn,
	faultsOf,
	manifestFaultsIn,
	VERSION_SITES,
	valueAt,
} from "../manifests.ts";

const declared = (path: string, version: string | undefined): Declared => {
	const site = VERSION_SITES.find((entry) => entry.path === path);
	return { path, at: (site?.at ?? ["version"]).join("."), version };
};

const allAt = (versions: readonly (string | undefined)[]): Declared[] =>
	VERSION_SITES.map((site, index) => declared(site.path, versions[index]));

const bodyFor = (at: readonly string[], version: string | undefined) => {
	if (version === undefined) {
		return {};
	}
	return at.length === 2 ? { metadata: { version } } : { version };
};

const plant = async (
	versions: readonly (string | undefined)[],
): Promise<string> => {
	const root = await mkdtemp(join(tmpdir(), "manifests-"));
	await Promise.all(
		VERSION_SITES.map(async ({ path, at }, index) => {
			await mkdir(join(root, dirname(path)), { recursive: true });
			await writeFile(
				join(root, path),
				JSON.stringify(bodyFor(at, versions[index])),
			);
		}),
	);
	return root;
};

describe("valueAt", () => {
	test("reads a string at the top level", () => {
		expect(valueAt({ version: "0.0.0" }, ["version"])).toBe("0.0.0");
	});

	test("reads a string under a nested key", () => {
		expect(
			valueAt({ metadata: { version: "0.0.0" } }, ["metadata", "version"]),
		).toBe("0.0.0");
	});

	test("gives nothing when a key of the path is absent", () => {
		expect(valueAt({ name: "claudetto" }, ["version"])).toBeUndefined();
	});

	test("gives nothing when the leaf is a number and not a string", () => {
		expect(valueAt({ version: 1 }, ["version"])).toBeUndefined();
	});

	test("gives nothing when a step of the path is not an object", () => {
		expect(
			valueAt({ metadata: null }, ["metadata", "version"]),
		).toBeUndefined();
	});
});

describe("faultsOf", () => {
	test("finds no fault when all four sites agree", () => {
		const faults = faultsOf(allAt(["0.0.0", "0.0.0", "0.0.0", "0.0.0"]));

		expect(faults).toEqual([]);
	});

	test("names the one site that disagrees with `package.json`", () => {
		const faults = faultsOf(
			allAt(["0.0.0", "0.0.0", "0.4.0-alpha.2", "0.0.0"]),
		);

		expect(faults.map(({ path }) => path)).toEqual([
			"plugins/claudetto/.claude-plugin/plugin.json",
		]);
	});

	test("names the second plugin, the site the prose used to miss", () => {
		const faults = faultsOf(
			allAt(["0.0.0", "0.0.0", "0.0.0", "0.4.0-alpha.2"]),
		);

		expect(faults.map(({ path }) => path)).toEqual([
			"plugins/claudetto-you-should-know/.claude-plugin/plugin.json",
		]);
	});

	test("names every site that disagrees, and not the reference", () => {
		const faults = faultsOf(allAt(["0.0.0", "0.1.0", "0.2.0", "0.3.0"]));

		expect(faults.map(({ path }) => path)).toEqual([
			".claude-plugin/marketplace.json",
			"plugins/claudetto/.claude-plugin/plugin.json",
			"plugins/claudetto-you-should-know/.claude-plugin/plugin.json",
		]);
	});

	test("faults a site whose version is missing", () => {
		const faults = faultsOf(allAt(["0.0.0", undefined, "0.0.0", "0.0.0"]));

		expect(faults.map(({ path }) => path)).toEqual([
			".claude-plugin/marketplace.json",
		]);
	});

	test("faults the reference itself when it declares no version", () => {
		const faults = faultsOf(allAt([undefined, "0.0.0", "0.0.0", "0.0.0"]));

		expect(faults.map(({ path }) => path)).toEqual(["package.json"]);
	});

	test("gives no fault for an empty list, so a caller with no site passes", () => {
		expect(faultsOf([])).toEqual([]);
	});
});

describe("manifestFaultsIn", () => {
	test("passes a planted tree whose four manifests agree", async () => {
		const root = await plant(["0.0.0", "0.0.0", "0.0.0", "0.0.0"]);

		expect(await manifestFaultsIn(root)).toEqual([]);
	});

	test("names the drifted manifest of a planted tree", async () => {
		const root = await plant(["0.0.0", "0.0.0", "0.0.0", "0.4.0-alpha.2"]);

		const faults = await manifestFaultsIn(root);

		expect(faults.map(({ path }) => path)).toEqual([
			"plugins/claudetto-you-should-know/.claude-plugin/plugin.json",
		]);
	});

	test("reads the marketplace version from under `metadata`", async () => {
		const root = await plant(["0.0.0", "0.0.0", "0.0.0", "0.0.0"]);

		const found = await declaredIn(root);

		expect(
			found.find(({ path }) => path === ".claude-plugin/marketplace.json"),
		).toEqual({
			path: ".claude-plugin/marketplace.json",
			at: "metadata.version",
			version: "0.0.0",
		});
	});
});
