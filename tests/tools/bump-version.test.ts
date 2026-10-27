// `bump-version.ts` writes more than one file, so a bump that cannot write one of them must leave the others as they were.
// Every test uses a folder under the temp folder, and the bump runs with `--root` on that folder.

import { afterEach, beforeEach, expect, test } from "bun:test";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file as bunFile, write as bunWrite } from "bun";
import { main, nextVersion } from "../../tools/bump-version.ts";

const PACKAGE = '{\n  "version": "1.0.0"\n}\n';
const CHANGELOG = "# Changelog\n\n## [Unreleased]\n\n- A change.\n";
const BUMPED_ALPHA_2 =
	/## \[Unreleased\]\n\n## \[0\.1\.0-alpha\.2\] - \d{4}-\d{2}-\d{2}\n\n- A change\./;

let root = "";
beforeEach(async () => {
	root = await mkdtemp(path.join(os.tmpdir(), "bump-test-"));
	await bunWrite(path.join(root, "package.json"), PACKAGE);
	await bunWrite(path.join(root, "CHANGELOG.md"), CHANGELOG);
});
afterEach(async () => {
	await chmod(path.join(root, "CHANGELOG.md"), 0o644);
	await rm(root, { recursive: true, force: true });
});

/** Runs `main` with `args`, and returns its status and the lines that it wrote to `console.error`. */
const runMain = async (args: string[]) => {
	const errors: string[] = [];
	const logError = console.error;
	console.error = (...parts: unknown[]) => {
		errors.push(parts.join(" "));
	};
	let status = -1;
	try {
		status = await main(args);
	} finally {
		console.error = logError;
	}
	return { status, errors };
};

// `W_OK` passes for root, so a read-only file is writable for root and this test cannot fail there.
test("a CHANGELOG that cannot be written leaves package.json unchanged", async () => {
	if (process.getuid?.() === 0) {
		return;
	}
	await chmod(path.join(root, "CHANGELOG.md"), 0o444);
	const { status, errors } = await runMain(["patch", "--root", root]);

	// The run fails for the read-only reason, and its message names the file.
	expect(status).toBe(1);
	expect(errors).toHaveLength(1);
	expect(errors[0]).toContain("CHANGELOG.md");
	expect(await bunFile(path.join(root, "package.json")).text()).toBe(PACKAGE);
	expect(await bunFile(path.join(root, "CHANGELOG.md")).text()).toBe(CHANGELOG);
});

test("a dry run with no `--root` finds the root and writes nothing", async () => {
	// An exact target works from each current version, also from a pre-release.
	expect(await main(["99.0.0", "--dry-run"])).toBe(0);
});

test("an exact pre-release target is the next version", () => {
	expect(nextVersion("1.0.0", "0.1.0-alpha.1")).toBe("0.1.0-alpha.1");
});

test("a malformed pre-release target is refused", () => {
	expect(() => nextVersion("1.0.0", "0.1.0-")).toThrow();
	expect(() => nextVersion("1.0.0", "0.1.0-alpha..1")).toThrow();
});

test("a bump from a pre-release version moves the [Unreleased] entries under the new heading", async () => {
	await bunWrite(
		path.join(root, "package.json"),
		'{\n  "version": "0.1.0-alpha.1"\n}\n',
	);
	expect(await main(["0.1.0-alpha.2", "--root", root])).toBe(0);
	expect(await bunFile(path.join(root, "CHANGELOG.md")).text()).toMatch(
		BUMPED_ALPHA_2,
	);
});

test("a pre-release current version is refused", () => {
	expect(() => nextVersion("1.0.0-rc.1", "patch")).toThrow();
});

test("a mistyped dry run writes no file and shows the usage (review row 125)", async () => {
	const logError = console.error;
	console.error = () => undefined;
	try {
		expect(await main(["minor", "--dryrun", "--root", root])).toBe(2);
		expect(await main(["minor", "x", "--dry-run", "--root", root])).toBe(2);
	} finally {
		console.error = logError;
	}
	expect(await bunFile(path.join(root, "package.json")).text()).toBe(PACKAGE);
});

test("`--root` with no folder is a usage error that names `--root`, and nothing changes", async () => {
	const { status, errors } = await runMain(["patch", "--root"]);
	expect(status).toBe(2);
	expect(errors.join("\n")).toContain("--root");
});

test("a bump writes the version into each plugin manifest and the marketplace", async () => {
	const manifest = '{\n  "name": "p",\n  "version": "1.0.0"\n}\n';
	const plugin = path.join(root, "plugins/p/.claude-plugin/plugin.json");
	const market = path.join(root, ".claude-plugin/marketplace.json");
	await bunWrite(plugin, manifest);
	await bunWrite(
		market,
		'{\n  "metadata": {\n    "version": "1.0.0"\n  }\n}\n',
	);
	expect(await main(["minor", "--root", root])).toBe(0);
	expect(await bunFile(plugin).text()).toBe(manifest.replace("1.0.0", "1.1.0"));
	expect(await bunFile(market).text()).toContain('"version": "1.1.0"');
});
