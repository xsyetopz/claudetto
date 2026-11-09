import { expect, test } from "claude-code/testing";
import { gatePackage } from "../texts.ts";
import { POLICY_FILES, packageVerdict } from "./packages.ts";

const hasOnly =
	(...files: string[]) =>
	(file: string) =>
		files.includes(file);

const denyBun = (lock: string, form: string, name: string) => ({
	decision: "deny",
	reason: gatePackage(lock, `\`${form}\``, name),
});

test("the policy files are the lockfiles, the deno files, and the build files", () => {
	expect(POLICY_FILES).toEqual([
		"bun.lock",
		"bun.lockb",
		"deno.json",
		"deno.jsonc",
		"deno.lock",
		"xmake.lua",
		"CMakeLists.txt",
		"build.ninja",
		"Makefile",
		"makefile",
		"GNUmakefile",
		"conanfile.py",
		"conanfile.txt",
	]);
});

for (const [verb, form] of [
	["install", "bun install"],
	["i", "bun install"],
	["ci", "bun install --frozen-lockfile"],
	["add", "bun add"],
	["uninstall", "bun remove"],
	["remove", "bun remove"],
	["rm", "bun remove"],
	["update", "bun update"],
	["up", "bun update"],
	["upgrade", "bun update"],
	["run", "bun run"],
	["task", "bun run"],
	["run-script", "bun run"],
	["test", "bun run test"],
	["t", "bun run test"],
	["exec", "bunx"],
	["dlx", "bunx"],
	["x", "bunx"],
	["view", "bun info"],
	["info", "bun info"],
	["frobnicate", "the matching `bun` command (`bun --help`)"],
] as const) {
	test(`npm ${verb} in a bun repo points to ${form}`, () => {
		expect(packageVerdict("npm", [verb], hasOnly("bun.lock"))).toEqual(
			denyBun("bun.lock", form, "npm"),
		);
	});
}

test("npm with no verb means install, and a second word means add", () => {
	const has = hasOnly("bun.lock");
	expect(packageVerdict("yarn", [], has)).toEqual(
		denyBun("bun.lock", "bun install", "yarn"),
	);
	expect(packageVerdict("pnpm", ["install", "left-pad"], has)).toEqual(
		denyBun("bun.lock", "bun add", "pnpm"),
	);
	expect(packageVerdict("npm", ["ci", "x"], has)).toEqual(
		denyBun("bun.lock", "bun install --frozen-lockfile", "npm"),
	);
});

test("flags are skipped when the verb is read", () => {
	expect(
		packageVerdict("npm", ["-g", "add", "x"], hasOnly("bun.lock")),
	).toEqual(denyBun("bun.lock", "bun add", "npm"));
	expect(packageVerdict("npm", ["--save"], hasOnly("bun.lock"))).toEqual(
		denyBun("bun.lock", "bun install", "npm"),
	);
});

test("npx and pnpx point to bunx, and bun.lockb counts as a bun lock", () => {
	for (const name of ["npx", "pnpx"]) {
		expect(packageVerdict(name, ["tsc"], hasOnly("bun.lockb"))).toEqual(
			denyBun("bun.lockb", "bunx", name),
		);
	}
});

test("a repo without a bun lock allows npm", () => {
	expect(packageVerdict("npm", ["install"], hasOnly())).toBeUndefined();
});

for (const verb of ["install", "add", "remove", "task", "x"]) {
	test(`deno ${verb} in a bun repo without deno files is denied`, () => {
		const verdict = packageVerdict("deno", [verb], hasOnly("bun.lock"));
		expect(verdict?.decision).toBe("deny");
	});
	test(`deno ${verb} after a flag in a bun repo is denied`, () => {
		const verdict = packageVerdict("deno", ["-q", verb], hasOnly("bun.lock"));
		expect(verdict?.decision).toBe("deny");
	});
}

test("deno names the bun form of its verb", () => {
	expect(packageVerdict("deno", ["install"], hasOnly("bun.lock"))).toEqual(
		denyBun("bun.lock", "bun install", "deno"),
	);
});

for (const file of ["deno.json", "deno.jsonc", "deno.lock"]) {
	test(`deno is allowed when the repo has ${file}`, () => {
		expect(
			packageVerdict("deno", ["install"], hasOnly("bun.lock", file)),
		).toBeUndefined();
	});
}

test("deno verbs outside the package set are allowed", () => {
	expect(
		packageVerdict("deno", ["run", "x.ts"], hasOnly("bun.lock")),
	).toBeUndefined();
	expect(packageVerdict("deno", [], hasOnly("bun.lock"))).toBeUndefined();
	expect(packageVerdict("deno", ["-q"], hasOnly("bun.lock"))).toBeUndefined();
});

const XMAKE_USE = {
	cmake: "`xmake config`, `xmake build`",
	ninja: "`xmake build`, `xmake clean`",
	make: "`xmake build`, `xmake install`, `xmake test`",
	conan: "`xmake require`",
} as const;

for (const [tool, use] of Object.entries(XMAKE_USE)) {
	test(`${tool} in an xmake repo points to xmake`, () => {
		expect(packageVerdict(tool, [], hasOnly("xmake.lua"))).toEqual({
			decision: "deny",
			reason: gatePackage("xmake.lua", use, tool),
		});
	});
	test(`${tool} is allowed in a repo without xmake.lua`, () => {
		expect(packageVerdict(tool, [], hasOnly())).toBeUndefined();
	});
}

for (const [tool, files] of [
	["cmake", ["CMakeLists.txt"]],
	["ninja", ["build.ninja"]],
	["make", ["Makefile", "makefile", "GNUmakefile"]],
	["conan", ["conanfile.py", "conanfile.txt"]],
] as const) {
	for (const file of files) {
		test(`${tool} is allowed in an xmake repo that has ${file}`, () => {
			expect(
				packageVerdict(tool, [], hasOnly("xmake.lua", file)),
			).toBeUndefined();
		});
	}
}
