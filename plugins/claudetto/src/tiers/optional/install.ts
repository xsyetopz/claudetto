import type { OptionalTool } from "./tools.ts";

/** `arch` is absent where the launch check cannot read it without a process. */
export interface Host {
	platform: string;
	arch?: string;
}

export type Install =
	| { kind: "command"; argv: readonly string[]; shown: string }
	| { kind: "zip"; url: string; folder: string; shown: string }
	| { kind: "none" };

const TARGETS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
	darwin: {
		arm64: "aarch64-apple-darwin",
		x64: "x86_64-apple-darwin",
	},
	linux: {
		x64: "x86_64-unknown-linux-gnu",
		arm64: "aarch64-unknown-linux-gnu",
	},
	win32: {
		x64: "x86_64-pc-windows-msvc",
		arm64: "aarch64-pc-windows-msvc",
		ia32: "i686-pc-windows-msvc",
	},
};

const NO_BOTTLE = new Set(["x86_64-apple-darwin"]);

export const targetOf = (host: Host): string | undefined =>
	host.arch === undefined ? undefined : TARGETS[host.platform]?.[host.arch];

/** Linux with a known release or an unread `arch`, and macOS on a target that has a bottle. */
const hasBottle = (host: Host, target: string | undefined): boolean => {
	if (host.platform === "linux") {
		return target !== undefined || host.arch === undefined;
	}
	return (
		host.platform === "darwin" && target !== undefined && !NO_BOTTLE.has(target)
	);
};

const folderOf = (host: Host): string =>
	host.platform === "win32" ? "%USERPROFILE%\\bin" : "~/.local/bin";

export const installFor = (
	tool: OptionalTool,
	host: Host,
	hasBrew: boolean,
): Install => {
	const target = targetOf(host);
	if (hasBrew && hasBottle(host, target)) {
		const argv = ["brew", "install", tool.brew];
		return { kind: "command", argv, shown: argv.join(" ") };
	}
	if (target === undefined) {
		return { kind: "none" };
	}
	const url = `${tool.release}/${tool.version}/app-${target}.zip`;
	const folder = folderOf(host);
	return { kind: "zip", url, folder, shown: `Unpack ${url} to ${folder}` };
};
