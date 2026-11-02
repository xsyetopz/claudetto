import type { Host } from "./install.ts";
import type { OptionalTool } from "./tools.ts";

const SHADOWED = new Set(["linux"]);
const SUFFIXES = [".exe", ".cmd"];

export const binaryNames = (tool: OptionalTool, host: Host): string[] => {
	const names = tool.binaries.filter(
		(name) => !(name === "sg" && SHADOWED.has(host.platform)),
	);
	if (host.platform !== "win32") {
		return names;
	}
	return names.flatMap((name) => SUFFIXES.map((suffix) => name + suffix));
};

export const isOnPath = async (
	names: readonly string[],
	host: Host,
	path: string | undefined,
	exists: (file: string) => Promise<boolean>,
): Promise<boolean> => {
	const windows = host.platform === "win32";
	const folders = (path ?? "")
		.split(windows ? ";" : ":")
		.filter((folder) => folder !== "");
	const joiner = windows ? "\\" : "/";
	const files = folders.flatMap((folder) =>
		names.map((name) => `${folder}${joiner}${name}`),
	);
	return (await Promise.all(files.map(exists))).some(Boolean);
};
