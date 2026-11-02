import { describe, expect, test } from "bun:test";
import {
	APPLE_SILICON_BREW,
	hostFromFiles,
	hostFromUname,
	MAC_MARKER,
} from "../host.ts";

const envOf = (os?: string, architecture?: string) => ({
	os,
	architecture,
});
const folders =
	(...held: string[]) =>
	async (path: string) =>
		held.includes(path);

describe("`hostFromUname`", () => {
	const cases: readonly [string, string, string, string | undefined][] = [
		["Darwin", "arm64", "darwin", "arm64"],
		["Darwin", "x86_64", "darwin", "x64"],
		["Linux", "x86_64", "linux", "x64"],
		["Linux", "aarch64\n", "linux", "arm64"],
		["MINGW64_NT-10.0", "x86_64", "win32", "x64"],
		["MSYS_NT-10.0", "i686", "win32", "ia32"],
		["Linux", "riscv64", "linux", undefined],
	];
	for (const [system, machine, platform, arch] of cases) {
		test(`${system} on ${machine.trim()} is ${platform} ${arch}`, () => {
			const host = hostFromUname(system, machine);

			expect(host.platform).toBe(platform);
			expect(host.arch).toBe(arch);
		});
	}
});

describe("`hostFromFiles`", () => {
	test("`OS` of `Windows_NT` is Windows, with the arch the variable names", async () => {
		const read = async (arch: string) =>
			hostFromFiles(envOf("Windows_NT", arch), folders());

		expect(await read("AMD64")).toEqual({ platform: "win32", arch: "x64" });
		expect(await read("ARM64")).toEqual({ platform: "win32", arch: "arm64" });
		expect(await read("x86")).toEqual({ platform: "win32", arch: "ia32" });
		expect(await read("IA64")).toEqual({ platform: "win32" });
	});

	test("the macOS system folder with the Apple silicon prefix is `arm64`", async () => {
		const host = await hostFromFiles(
			envOf(),
			folders(MAC_MARKER, APPLE_SILICON_BREW),
		);

		expect(host).toEqual({ platform: "darwin", arch: "arm64" });
	});

	test("the macOS system folder alone leaves the arch unread", async () => {
		expect(await hostFromFiles(envOf(), folders(MAC_MARKER))).toEqual({
			platform: "darwin",
		});
	});

	test("no marker is Linux with the arch unread", async () => {
		expect(await hostFromFiles(envOf(), folders())).toEqual({
			platform: "linux",
		});
	});
});
