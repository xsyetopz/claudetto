import type { Host } from "./install.ts";

const WINDOWS_ARCH: Readonly<Record<string, string>> = {
	AMD64: "x64",
	ARM64: "arm64",
	x86: "ia32",
};

const UNAME_ARCH: Readonly<Record<string, string>> = {
	arm64: "arm64",
	aarch64: "arm64",
	x86_64: "x64",
	amd64: "x64",
	i686: "ia32",
	i386: "ia32",
};

const WINDOWS_SHELLS = ["mingw", "msys", "cygwin"];

/** From `uname -s` and `uname -m`, which `/claudetto:setup` may run. */
export const hostFromUname = (system: string, machine: string): Host => {
	const name = system.trim().toLowerCase();
	const arch = UNAME_ARCH[machine.trim().toLowerCase()];
	const platform = WINDOWS_SHELLS.some((shell) => name.startsWith(shell))
		? "win32"
		: name;
	return arch === undefined ? { platform } : { platform, arch };
};

/** The macOS system folder, which no other platform has. */
export const MAC_MARKER = "/System/Library/CoreServices";
/** Homebrew's prefix on Apple silicon; the Intel prefix is `/usr/local`, shared with other tools. */
export const APPLE_SILICON_BREW = "/opt/homebrew";

/** `OS` and `PROCESSOR_ARCHITECTURE`, read at the call site because `$.env.get` takes a literal name. */
export interface WindowsEnv {
	os: string | undefined;
	architecture: string | undefined;
}

/** From environment variables and folders, for the launch check, which runs no process. */
export const hostFromFiles = async (
	env: WindowsEnv,
	exists: (path: string) => Promise<boolean>,
): Promise<Host> => {
	if (env.os === "Windows_NT") {
		const arch = WINDOWS_ARCH[env.architecture ?? ""];
		return arch === undefined
			? { platform: "win32" }
			: { platform: "win32", arch };
	}
	if (!(await exists(MAC_MARKER))) {
		return { platform: "linux" };
	}
	return (await exists(APPLE_SILICON_BREW))
		? { platform: "darwin", arch: "arm64" }
		: { platform: "darwin" };
};
