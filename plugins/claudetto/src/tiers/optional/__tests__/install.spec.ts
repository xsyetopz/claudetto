import { describe, expect, test } from "bun:test";
import { installFor, targetOf } from "../install.ts";
import { AST_GREP, OPTIONAL_TOOLS } from "../tools.ts";

const RELEASE = `https://github.com/ast-grep/ast-grep/releases/download/${AST_GREP.version}`;

describe("the table", () => {
	test("holds ast-grep alone, pinned to 0.51.1", () => {
		expect(OPTIONAL_TOOLS.map((tool) => tool.id)).toEqual(["ast-grep"]);
		expect(AST_GREP.version).toBe("0.51.1");
	});

	test("names the two binaries", () => {
		expect(AST_GREP.binaries).toEqual(["ast-grep", "sg"]);
	});
});

describe("targetOf", () => {
	const cases: readonly [string, string, string][] = [
		["darwin", "arm64", "aarch64-apple-darwin"],
		["darwin", "x64", "x86_64-apple-darwin"],
		["linux", "x64", "x86_64-unknown-linux-gnu"],
		["linux", "arm64", "aarch64-unknown-linux-gnu"],
		["win32", "x64", "x86_64-pc-windows-msvc"],
		["win32", "arm64", "aarch64-pc-windows-msvc"],
		["win32", "ia32", "i686-pc-windows-msvc"],
	];
	for (const [platform, arch, target] of cases) {
		test(`${platform} on ${arch} is ${target}`, () => {
			expect(targetOf({ platform, arch })).toBe(target);
		});
	}

	test("a platform with no release has no target", () => {
		expect(targetOf({ platform: "linux", arch: "ia32" })).toBeUndefined();
		expect(targetOf({ platform: "freebsd", arch: "x64" })).toBeUndefined();
	});
});

describe("installFor with brew on the PATH", () => {
	test("macOS on Apple silicon runs brew", () => {
		const install = installFor(
			AST_GREP,
			{ platform: "darwin", arch: "arm64" },
			true,
		);

		expect(install).toEqual({
			kind: "command",
			argv: ["brew", "install", "ast-grep"],
			shown: "brew install ast-grep",
		});
	});

	test("Linux runs brew on both architectures", () => {
		for (const arch of ["x64", "arm64"]) {
			const install = installFor(AST_GREP, { platform: "linux", arch }, true);

			expect(install.kind).toBe("command");
		}
	});

	test("macOS on Intel has no bottle, so it takes the zip", () => {
		const install = installFor(
			AST_GREP,
			{ platform: "darwin", arch: "x64" },
			true,
		);

		expect(install).toEqual({
			kind: "zip",
			url: `${RELEASE}/app-x86_64-apple-darwin.zip`,
			folder: "~/.local/bin",
			shown: `Unpack ${RELEASE}/app-x86_64-apple-darwin.zip to ~/.local/bin`,
		});
	});
});

describe("installFor with no package manager", () => {
	const cases: readonly [string, string, string, string][] = [
		["darwin", "arm64", "aarch64-apple-darwin", "~/.local/bin"],
		["darwin", "x64", "x86_64-apple-darwin", "~/.local/bin"],
		["linux", "x64", "x86_64-unknown-linux-gnu", "~/.local/bin"],
		["linux", "arm64", "aarch64-unknown-linux-gnu", "~/.local/bin"],
		["win32", "x64", "x86_64-pc-windows-msvc", "%USERPROFILE%\\bin"],
		["win32", "arm64", "aarch64-pc-windows-msvc", "%USERPROFILE%\\bin"],
		["win32", "ia32", "i686-pc-windows-msvc", "%USERPROFILE%\\bin"],
	];
	for (const [platform, arch, target, folder] of cases) {
		test(`${platform} on ${arch} gets the ${target} zip and ${folder}`, () => {
			const install = installFor(AST_GREP, { platform, arch }, false);

			expect(install).toEqual({
				kind: "zip",
				url: `${RELEASE}/app-${target}.zip`,
				folder,
				shown: `Unpack ${RELEASE}/app-${target}.zip to ${folder}`,
			});
		});
	}

	test("a platform with no release gets no install", () => {
		expect(
			installFor(AST_GREP, { platform: "freebsd", arch: "x64" }, false),
		).toEqual({
			kind: "none",
		});
	});

	test("brew on Windows is not used, since no bottle is built there", () => {
		const install = installFor(
			AST_GREP,
			{ platform: "win32", arch: "x64" },
			true,
		);

		expect(install.kind).toBe("zip");
	});
});

describe("installFor with an arch the launch check could not read", () => {
	test("Linux with brew still runs brew", () => {
		expect(installFor(AST_GREP, { platform: "linux" }, true).kind).toBe(
			"command",
		);
	});

	test("Linux without brew has no zip to name", () => {
		expect(installFor(AST_GREP, { platform: "linux" }, false)).toEqual({
			kind: "none",
		});
	});

	test("macOS with an unread arch has nothing to name", () => {
		expect(installFor(AST_GREP, { platform: "darwin" }, true)).toEqual({
			kind: "none",
		});
	});

	test("Linux on `ia32` has no brew formula to name", () => {
		expect(
			installFor(AST_GREP, { platform: "linux", arch: "ia32" }, true),
		).toEqual({ kind: "none" });
	});
});
