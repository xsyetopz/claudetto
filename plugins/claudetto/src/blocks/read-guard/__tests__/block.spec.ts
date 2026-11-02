import { describe, expect, test } from "bun:test";
import { heavyFile, readGuardOn, refusalFor } from "../block.ts";

describe("heavyFile", () => {
	test.each([
		"/repo/bun.lock",
		"bun.lockb",
		"/repo/package-lock.json",
		"/repo/npm-shrinkwrap.json",
		"/repo/pnpm-lock.yaml",
		"/repo/yarn.lock",
		"/repo/deno.lock",
		"/repo/Cargo.lock",
		"/repo/Gemfile.lock",
		"/repo/poetry.lock",
		"/repo/uv.lock",
		"/repo/Pipfile.lock",
		"/repo/composer.lock",
		"/repo/Package.resolved",
		"/repo/go.sum",
		"/repo/packages.lock.json",
		"/repo/conan.lock",
		"/repo/gradle.lockfile",
		"/repo/flake.lock",
		"/repo/public/app.min.js",
		"/repo/public/app.min.css",
		"/repo/public/app.js.map",
		"/repo/node_modules/p/i.js",
		"/repo/.next/server/page.js",
		"/x/DerivedData/Build/a.o",
		"/repo/.build/debug/a",
		"/repo/src/__pycache__/a.pyc",
		"/repo/.venv/lib/a.py",
		"/repo/.gradle/a",
		"/repo/.tox/a",
		"/repo/.mypy_cache/a",
		"/repo/.ruff_cache/a",
		"/repo/.pytest_cache/a",
		"C:\\repo\\node_modules\\p\\i.js",
	])("%s is heavy", (path) => {
		expect(heavyFile(path)).toBe(true);
	});

	test.each([
		"/repo/src/index.ts",
		"/repo/build/main.ts",
		"/repo/dist/main.js",
		"/repo/target/a.rs",
		"/repo/bin/run",
		"/repo/obj/a.cs",
		"/repo/docs/bun.lock.md",
		"/repo/src/node_modules_notes.md",
		"/repo/mins.js",
	])("%s is not heavy", (path) => {
		expect(heavyFile(path)).toBe(false);
	});
});

describe("refusalFor", () => {
	test("denies a whole read of a heavy file, naming the way out", () => {
		const reason = refusalFor({ file_path: "/repo/bun.lock" });
		expect(reason).toContain("`limit`");
		expect(reason).toContain("`rg`");
	});

	test("lets a read with a `limit` through", () => {
		expect(refusalFor({ file_path: "/repo/bun.lock", limit: 40 })).toBe(
			undefined,
		);
	});

	test("lets a read of any other file through", () => {
		expect(refusalFor({ file_path: "/repo/src/a.ts" })).toBe(undefined);
	});

	test("lets a call without a path through", () => {
		expect(refusalFor({})).toBe(undefined);
	});
});

describe("readGuardOn", () => {
	test.each([
		[{}, true],
		[{ readGuardEnabled: true }, true],
		[{ readGuardEnabled: false }, false],
	])("%j is %p", (options, expected) => {
		expect(readGuardOn(options)).toBe(expected);
	});
});
